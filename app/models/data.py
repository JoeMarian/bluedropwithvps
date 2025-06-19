from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from bson import ObjectId

# IST timezone (UTC+5:30)
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, _core_schema, _handler):
        return {"type": "string", "description": "ObjectId string"}

class DataPoint(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    dashboard_id: str
    field_name: str
    value: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(IST_TIMEZONE))
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class DataPointCreate(BaseModel):
    dashboard_id: str
    field_name: str
    value: float
    metadata: Optional[Dict[str, Any]] = None

class DataPointResponse(BaseModel):
    id: str
    dashboard_id: str
    field_name: str
    value: float
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()} 