from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from app.core.security import get_password_hash
from app.db.mongodb import mongodb
from app.schemas.user import User, UserCreate, UserUpdate
from app.api.deps import get_current_admin_user, get_current_user
from app.services.email_service import email_service
from fastapi import status

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=User)
async def read_current_user(
    current_user: User = Depends(get_current_user),
) -> Any:
    return current_user

@router.get("/", response_model=List[User])
async def get_users(
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """Get all users (admin only)"""
    try:
        cursor = mongodb.get_collection("users").find({})
        users = await cursor.to_list(length=None)
        
        result = []
        for user in users:
            user["_id"] = str(user["_id"])
            if "created_at" in user:
                user["created_at"] = user["created_at"].isoformat()
            if "updated_at" in user:
                user["updated_at"] = user["updated_at"].isoformat()
            if "verification_sent_at" in user:
                user["verification_sent_at"] = user["verification_sent_at"].isoformat()
            if "approved_at" in user:
                user["approved_at"] = user["approved_at"].isoformat()
            
            result.append(user)
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch users: {str(e)}"
        )

@router.get("/pending/", response_model=List[User])
async def get_pending_users(
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """Get users pending verification or approval (admin only)"""
    try:
        # Get users that are either not verified or not approved
        cursor = mongodb.get_collection("users").find({
            "$or": [
                {"is_verified": False},
                {"is_approved": False}
            ],
            "is_admin": False  # Exclude admin users
        })
        users = await cursor.to_list(length=None)
        
        result = []
        for user in users:
            user["_id"] = str(user["_id"])
            if "created_at" in user:
                user["created_at"] = user["created_at"].isoformat()
            if "updated_at" in user:
                user["updated_at"] = user["updated_at"].isoformat()
            if "verification_sent_at" in user:
                user["verification_sent_at"] = user["verification_sent_at"].isoformat()
            if "approved_at" in user:
                user["approved_at"] = user["approved_at"].isoformat()
            
            result.append(user)
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch pending users: {str(e)}"
        )

@router.put("/{user_id}/approve")
@router.put("/{user_id}/approve/")
async def approve_user(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """Approve a user (admin only)"""
    try:
        # Convert string ID to ObjectId
        try:
            object_id = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        user = await mongodb.get_collection("users").find_one({"_id": object_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user["is_admin"]:
            raise HTTPException(status_code=400, detail="Cannot approve admin user")
        now = datetime.utcnow()
        # Update user
        await mongodb.get_collection("users").update_one(
            {"_id": object_id},
            {
                "$set": {
                    "is_approved": True,
                    "approved_by": str(current_user.id),
                    "approved_at": now,
                    "updated_at": now
                }
            }
        )
        # Send approval notification email
        email_sent = email_service.send_approval_notification_email(
            user["email"],
            user["username"],
            approved=True
        )
        if not email_sent:
            print(f"Failed to send approval email to {user['email']}")
        return {"message": "User approved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to approve user: {str(e)}"
        )

@router.put("/{user_id}/reject")
@router.put("/{user_id}/reject/")
async def reject_user(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """Reject a user (admin only)"""
    try:
        # Convert string ID to ObjectId
        try:
            object_id = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        user = await mongodb.get_collection("users").find_one({"_id": object_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user["is_admin"]:
            raise HTTPException(status_code=400, detail="Cannot reject admin user")
        now = datetime.utcnow()
        # Update user
        await mongodb.get_collection("users").update_one(
            {"_id": object_id},
            {
                "$set": {
                    "is_approved": False,
                    "rejected_by": str(current_user.id),
                    "rejected_at": now,
                    "updated_at": now
                }
            }
        )
        # Send rejection notification email
        email_sent = email_service.send_approval_notification_email(
            user["email"],
            user["username"],
            approved=False
        )
        if not email_sent:
            print(f"Failed to send rejection email to {user['email']}")
        return {"message": "User rejected successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reject user: {str(e)}"
        )

@router.delete("/{user_id}")
@router.delete("/{user_id}/")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    try:
        print(f"[DEBUG] user_id (raw): {user_id}, type: {type(user_id)}")
        try:
            object_id = ObjectId(user_id)
            print(f"[DEBUG] object_id: {object_id}, type: {type(object_id)}")
        except Exception as e:
            print(f"[DEBUG] ObjectId conversion error: {e}")
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        user = await mongodb.get_collection("users").find_one({"_id": object_id})
        print(f"[DEBUG] user found: {user}")
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user["is_admin"]:
            raise HTTPException(status_code=400, detail="Cannot delete admin user")
        dashboards = await mongodb.get_collection("dashboards").find(
            {"assigned_users": user_id}
        ).to_list(length=None)
        for dashboard in dashboards:
            await mongodb.get_collection("dashboards").update_one(
                {"_id": dashboard["_id"]},
                {"$pull": {"assigned_users": user_id}}
            )
        await mongodb.get_collection("users").delete_one({"_id": object_id})
        print(f"[DEBUG] user deleted: {object_id}")
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Exception in delete_user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

@router.put("/users/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    try:
        object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    user = await mongodb.get_collection("users").find_one({"_id": object_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = user_in.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    await mongodb.get_collection("users").update_one(
        {"_id": object_id},
        {"$set": update_data}
    )
    updated_user = await mongodb.get_collection("users").find_one({"_id": object_id})
    return User(**updated_user)

@router.post("/register", response_model=User)
async def register(user_in: UserCreate) -> Any:
    """
    Register new user
    """
    # Check if user exists by email
    user = await mongodb.get_collection("users").find_one({"email": user_in.email})
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    # Check if user exists by username
    user = await mongodb.get_collection("users").find_one({"username": user_in.username})
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        ) 