from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from pydantic import ValidationError
from bson import ObjectId
import secrets

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.mongodb import mongodb
from app.schemas.user import User, UserCreate, Token, TokenPayload
from app.services.email_service import email_service

# IST timezone (UTC+5:30)
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
async def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = await mongodb.get_collection("users").find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is verified and approved
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please verify your email address before logging in",
        )
    
    if not user.get("is_approved", False) and not user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account is pending approval by an administrator",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["_id"])}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.post("/register", response_model=User)
async def register(user_in: UserCreate) -> Any:
    """
    Register new user
    """
    # Check if user exists
    user = await mongodb.get_collection("users").find_one({"email": user_in.email})
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    user = await mongodb.get_collection("users").find_one({"username": user_in.username})
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    
    # Create new user
    now = datetime.now(IST_TIMEZONE)
    verification_token = secrets.token_urlsafe(32)
    user_data = {
        "email": user_in.email,
        "username": user_in.username,
        "hashed_password": get_password_hash(user_in.password),
        "is_active": True,
        "is_admin": False,
        "is_verified": False,  # Always require email verification
        "is_approved": False,  # Always require admin approval
        "created_at": now,
        "updated_at": now,
        "assigned_dashboards": [],
        "verification_token": verification_token,
        "verification_sent_at": now
    }
    
    result = await mongodb.get_collection("users").insert_one(user_data)
    user_data["_id"] = str(result.inserted_id)
    
    # Send verification email
    email_sent = email_service.send_verification_email(
        user_in.email, 
        user_in.username, 
        verification_token
    )
    
    if not email_sent:
        # If email fails, we should still create the user but log the issue
        print(f"Failed to send verification email to {user_in.email}")
    
    return User(**user_data)

@router.post("/verify-email/{token}")
async def verify_email(token: str) -> Any:
    """
    Verify email with token
    """
    print(f"Attempting to verify token: {token}")
    
    # Check if token exists in database
    user = await mongodb.get_collection("users").find_one({"verification_token": token})
    if not user:
        print(f"Token not found in database: {token}")
        # Let's also check if there are any users with verification tokens
        users_with_tokens = await mongodb.get_collection("users").find({"verification_token": {"$exists": True}}).to_list(length=10)
        print(f"Users with verification tokens: {len(users_with_tokens)}")
        for u in users_with_tokens:
            print(f"User: {u.get('username')}, Token: {u.get('verification_token')[:10]}...")
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token",
        )
    
    print(f"Found user: {user.get('username')} with token")
    
    # Check if token is expired (24 hours)
    verification_sent_at = user.get("verification_sent_at")
    if verification_sent_at:
        # Make verification_sent_at timezone-aware if it is naive
        if verification_sent_at.tzinfo is None:
            verification_sent_at = verification_sent_at.replace(tzinfo=IST_TIMEZONE)
        token_age = datetime.now(IST_TIMEZONE) - verification_sent_at
        print(f"Token age: {token_age}")
        if token_age > timedelta(hours=24):
            print(f"Token expired: {token_age} > 24 hours")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired. Please register again.",
            )
    
    print(f"Token is valid, proceeding with verification")
    
    await mongodb.get_collection("users").update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "is_verified": True,
                "updated_at": datetime.now(IST_TIMEZONE)
            },
            "$unset": {
                "verification_token": "",
                "verification_sent_at": ""
            }
        }
    )
    
    print(f"User {user.get('username')} verified successfully")
    # Notify admin by email
    try:
        admin_email = settings.ADMIN_EMAIL
        subject = f"User Verified: {user.get('username')} ({user.get('email')})"
        html_content = f"<p>User <b>{user.get('username')}</b> ({user.get('email')}) has verified their email and is awaiting approval.</p>"
        email_service.send_email(admin_email, subject, html_content)
    except Exception as e:
        print(f"Failed to send admin notification: {e}")
    return {"message": "Email verified successfully. Please wait for admin approval to login."}

@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)) -> Any:
    """
    Get current user
    """
    return current_user 