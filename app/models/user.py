from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel, EmailStr

# IST timezone (UTC+5:30)
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

class User(BaseModel):
    username: str
    email: EmailStr
    hashed_password: str
    is_verified: bool = False
    is_approved: bool = False
    is_admin: bool = False
    created_at: datetime = datetime.now(IST_TIMEZONE)
    updated_at: datetime = datetime.now(IST_TIMEZONE)
    assigned_dashboards: List[str] = []

class UserInDB(User):
    id: str
