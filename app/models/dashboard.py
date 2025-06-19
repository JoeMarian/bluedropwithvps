from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from pydantic import BaseModel

# IST timezone (UTC+5:30)
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

class Widget(BaseModel):
    type: str  # "chart", "numeric", "bar"
    title: str
    field: str
    config: Dict
    created_at: datetime = datetime.now(IST_TIMEZONE)

class Field(BaseModel):
    name: str
    type: str  # "numeric", "text", "boolean"
    unit: Optional[str] = None
    last_value: Optional[float] = None
    last_update: Optional[datetime] = None

class Dashboard(BaseModel):
    name: str
    api_key: str
    fields: List[Field]
    widgets: List[Widget]
    is_public: bool = False
    assigned_users: List[str] = []
    created_at: datetime = datetime.now(IST_TIMEZONE)
    updated_at: datetime = datetime.now(IST_TIMEZONE)

class DashboardInDB(Dashboard):
    id: str
