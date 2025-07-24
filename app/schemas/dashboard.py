from typing import List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime

class DashboardField(BaseModel):
    name: str
    type: str
    unit: Optional[str] = None
    value: Optional[float] = None

class Widget(BaseModel):
    id: str
    type: str
    title: str
    field: str
    chartType: Optional[str] = None
    timeRange: Optional[str] = None
    aggregationInterval: Optional[str] = None
    unit: Optional[str] = None
    axisLabels: Optional[dict] = None
    rules: Optional[list] = None

class DashboardBase(BaseModel):
    name: str
    description: Optional[str] = ""
    fields: List[DashboardField] = []
    widgets: List[Widget] = []
    assigned_users: List[str] = []

class DashboardCreate(DashboardBase):
    is_public: bool = False

class DashboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    fields: Optional[List[DashboardField]] = None
    widgets: Optional[List[Widget]] = None
    assigned_users: Optional[List[str]] = None

class Dashboard(DashboardBase):
    id: str = Field(alias="_id")
    created_by: str
    api_key: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class DashboardData(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_public: bool
    fields: List[DashboardField]
    widgets: List[Widget]
    assigned_users: List[str]
    api_key: str
    created_at: datetime
    updated_at: datetime 