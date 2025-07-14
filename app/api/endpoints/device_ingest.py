# app/api/endpoints/device_ingest.py

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from app.db.mongodb import mongodb
from bson import ObjectId

# IST timezone (UTC+5:30) - Define here as it's used in this module
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

router = APIRouter()

class DeviceIngestRequest(BaseModel):
    dashboard_id: str
    field_name: str
    value: float

@router.post("/device-ingest")
async def device_ingest(
    request: Request,
    payload: DeviceIngestRequest
):
    """
    Endpoint for device data ingestion.
    Requires an X-API-KEY header for authentication.
    """
    try:
        # 1. Get API key from header
        api_key = request.headers.get("X-API-KEY")
        if not api_key:
            raise HTTPException(status_code=401, detail="Missing API key")

        # 2. Find dashboard with this API key
        dashboard = await mongodb.get_collection("dashboards").find_one({"api_key": api_key})
        if not dashboard:
            raise HTTPException(status_code=403, detail="Invalid API key or dashboard not found for this key")

        # 3. Check dashboard_id matches the one associated with the API key
        # Convert ObjectId to string for comparison if dashboard["_id"] is an ObjectId
        if str(dashboard["_id"]) != payload.dashboard_id:
            raise HTTPException(status_code=403, detail="Provided dashboard ID does not match the API key's associated dashboard.")

        # 4. Check if the field exists in the dashboard's configuration
        field_exists = any(field["name"] == payload.field_name for field in dashboard.get("fields", []))
        if not field_exists:
            raise HTTPException(status_code=404, detail=f"Field '{payload.field_name}' not found in dashboard '{payload.dashboard_id}'.")

        # 5. Insert the new data point into the 'data_points' collection
        current_time_ist = datetime.now(IST_TIMEZONE)
        data_point = {
            "dashboard_id": payload.dashboard_id,
            "field_name": payload.field_name,
            "value": float(payload.value),
            "timestamp": current_time_ist,
            "metadata": {"source": "device", "api_key_used": api_key} # Added api_key_used for logging/auditing
        }
        result = await mongodb.get_collection("data_points").insert_one(data_point)

        # 6. Update the dashboard's field with the latest value and update timestamp
        # This ensures the dashboard always shows the most recent data for quick access
        await mongodb.get_collection("dashboards").update_one(
            {"_id": ObjectId(payload.dashboard_id), "fields.name": payload.field_name},
            {
                "$set": {
                    "fields.$.last_value": float(payload.value),
                    "fields.$.last_update": current_time_ist,
                    "updated_at": current_time_ist # Update dashboard's overall updated_at
                }
            }
        )

        return {
            "message": "Data point ingested successfully",
            "data_point_id": str(result.inserted_id),
            "value": payload.value,
            "timestamp": data_point["timestamp"].isoformat()
        }

    except HTTPException as http_exc:
        # Re-raise HTTPException directly as they are intended client errors
        raise http_exc
    except Exception as e:
        # Catch any other unexpected errors and return a 500 Internal Server Error
        import traceback
        print(f"CRITICAL ERROR during device data ingestion: {e}")
        traceback.print_exc() # Print full traceback for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred during data ingestion: {e}")

