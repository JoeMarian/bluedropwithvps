# app/api/endpoints/auth.py

from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from pydantic import ValidationError, BaseModel
from bson import ObjectId
import secrets
import traceback # Import traceback for detailed error logging

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.mongodb import mongodb
from app.schemas.user import User, UserCreate, Token, TokenPayload
from app.services.email_service import email_service

# IST timezone (UTC+5:50)
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

router = APIRouter()

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    password: str
    confirm_password: str

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
        # Consider raising a warning or sending an admin alert here if email sending is critical
        # For now, just print to console.

    return User(**user_data)

@router.post("/verify-email/{token}")
async def verify_email(token: str) -> Any:
    """
    Verify email with token
    """
    print(f"[VERIFY EMAIL] Attempting to verify token: {token}")

    # Check if token exists in database
    user = await mongodb.get_collection("users").find_one({"verification_token": token})
    if not user:
        print(f"[VERIFY EMAIL] Token not found in database: {token}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token",
        )

    print(f"[VERIFY EMAIL] Found user: {user.get('username')} with token")

    # Check if token is expired (24 hours)
    verification_sent_at = user.get("verification_sent_at")
    if verification_sent_at:
        # Make verification_sent_at timezone-aware if it is naive
        if verification_sent_at.tzinfo is None:
            verification_sent_at = verification_sent_at.replace(tzinfo=IST_TIMEZONE)
        token_age = datetime.now(IST_TIMEZONE) - verification_sent_at
        print(f"[VERIFY EMAIL] Token age: {token_age}")
        if token_age > timedelta(hours=24):
            print(f"[VERIFY EMAIL] Token expired: {token_age} > 24 hours")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired. Please register again.",
            )

    print(f"[VERIFY EMAIL] Token is valid, proceeding with verification")

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

    print(f"[VERIFY EMAIL] User {user.get('username')} verified successfully")
    # Notify admin by email
    try:
        admin_email = settings.ADMIN_EMAIL
        subject = f"User Verified: {user.get('username')} ({user.get('email')})"
        html_content = f"<p>User <b>{user.get('username')}</b> ({user.get('email')}) has verified their email and is awaiting approval.</p>"
        email_service.send_email(admin_email, subject, html_content)
        print(f"[VERIFY EMAIL] Admin notification sent to {admin_email}")
    except Exception as e:
        print(f"[VERIFY EMAIL] Failed to send admin notification: {e}")
        traceback.print_exc() # Print traceback for admin email error as well

    return {"message": "Email verified successfully. Please wait for admin approval to login."}

@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)) -> Any:
    """
    Get current user
    """
    return current_user

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    print(f"[FORGOT PASS] Received forgot password request for email: {request.email}")
    user = await mongodb.get_collection("users").find_one({"email": request.email})
    if not user:
        print(f"[FORGOT PASS] Email {request.email} not found in database. Returning generic success message.")
        # Always return success to avoid leaking info about registered emails
        return {"message": "If the email exists, a reset link has been sent."}

    token = secrets.token_urlsafe(32)
    # Changed expiry to 1 hour
    expiry = datetime.now(IST_TIMEZONE) + timedelta(hours=24)
    print(f"[FORGOT PASS] User found ({user.get('username')}). Generating token: {token[:5]}... and expiry: {expiry}")
    await mongodb.get_collection("users").update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": token, "reset_token_expiry": expiry}}
    )
    email_service.send_password_reset_email(user["email"], user["username"], token)
    print(f"[FORGOT PASS] Password reset email sent to {user['email']}.")
    return {"message": "If the email exists, a reset link has been sent."}

@router.post("/reset-password/{token}")
async def reset_password(token: str, request: ResetPasswordRequest):
    """
    Resets user password using a valid token.
    """
    try:
        print(f"[RESET PASS] Received reset password request for token: {token}")
        print(f"[RESET PASS] New password length: {len(request.password) if request.password else 0}")
        print(f"[RESET PASS] Password: {'*' * len(request.password) if request.password else 'N/A'}, Confirm: {'*' * len(request.confirm_password) if request.confirm_password else 'N/A'}")


        if request.password != request.confirm_password:
            print("[RESET PASS] Error: Passwords do not match.")
            raise HTTPException(status_code=400, detail="Passwords do not match.")

        # Check password length on backend as well for robustness
        if len(request.password) < 6:
            print("[RESET PASS] Error: Password too short.")
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

        user = await mongodb.get_collection("users").find_one({"reset_token": token})
        print(f"[RESET PASS] User lookup for token '{token[:5]}...': {user.get('username') if user else 'None'}")

        if not user:
            print(f"[RESET PASS] Error: Invalid or expired token (user not found in DB or token doesn't match).")
            raise HTTPException(status_code=400, detail="Invalid or expired token.")

        expiry = user.get("reset_token_expiry")
        print(f"[RESET PASS] Token expiry from DB: {expiry}, type: {type(expiry)}")

        # Ensure expiry is timezone-aware
        if expiry and getattr(expiry, 'tzinfo', None) is None:
            expiry = expiry.replace(tzinfo=IST_TIMEZONE)
            print(f"[RESET PASS] Expiry after timezone conversion: {expiry}")

        current_time_ist = datetime.now(IST_TIMEZONE)
        print(f"[RESET PASS] Current time (IST): {current_time_ist}")

        if not expiry:
            print("[RESET PASS] Error: Reset token expiry date not found in user document.")
            raise HTTPException(status_code=400, detail="Invalid or expired token.")
        elif current_time_ist > expiry:
            print(f"[RESET PASS] Error: Token expired. Current: {current_time_ist}, Expiry: {expiry}")
            raise HTTPException(status_code=400, detail="Token expired.")

        hashed_password = get_password_hash(request.password)
        print(f"[RESET PASS] Password successfully hashed.")

        update_result = await mongodb.get_collection("users").update_one(
            {"_id": user["_id"]},
            {"$set": {"hashed_password": hashed_password, "updated_at": datetime.now(IST_TIMEZONE)},
             "$unset": {"reset_token": "", "reset_token_expiry": ""}}
        )
        print(f"[RESET PASS] MongoDB update result: Matched Count={update_result.matched_count}, Modified Count={update_result.modified_count}")

        if update_result.modified_count == 0:
            print("[RESET PASS] Warning: User document not modified during password reset. Possible concurrent update or no change needed.")
            # This could happen if the user's password was somehow already the same, or an issue with _id matching.
            # It's not necessarily an error, but worth noting.

        print(f"[RESET PASS] User {user.get('username')} password reset successful.")
        return {"message": "Password reset successful. You can now log in."}

    except HTTPException as http_exc:
        # Re-raise HTTPException directly as it's an intended client error
        print(f"[RESET PASS] HTTP Exception: {http_exc.detail}, Status: {http_exc.status_code}")
        raise http_exc
    except Exception as e:
        # Catch all other unexpected errors
        print(f"[RESET PASS] CRITICAL ERROR during password reset: {e}")
        traceback.print_exc() # Print the full traceback to the console
        raise HTTPException(status_code=500, detail="An unexpected error occurred during password reset. Please try again or contact support.")