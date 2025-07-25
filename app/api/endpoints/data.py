# app/api/endpoints/data.py

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Body
from app.db.mongodb import mongodb
from app.models.data import DataPointResponse, DataPointCreate
from app.api.deps import get_current_user
from app.models.user import User
from bson import ObjectId
# Removed BaseModel import as DeviceIngestRequest is moved
# Removed DeviceIngestRequest import as it's moved

# IST timezone (UTC+5:30)
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

router = APIRouter()

@router.get("/dashboard/{dashboard_id}/field/{field_name}/data", response_model=List[DataPointResponse])
async def get_field_data(
    dashboard_id: str,
    field_name: str,
    hours: int = Query(default=24, description="Number of hours to fetch data for"),
    limit: int = Query(default=100, description="Maximum number of data points to return"),
    current_user: User = Depends(get_current_user)
):
    """
    Get time-series data for a specific field in a dashboard
    """
    try:
        # Validate dashboard exists and user has access
        dashboard = await mongodb.get_collection("dashboards").find_one({"_id": ObjectId(dashboard_id)})
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")

        # Check if user has access to this dashboard
        if not dashboard.get("is_public", False) and str(current_user.id) not in dashboard.get("assigned_users", []):
            raise HTTPException(status_code=403, detail="Access denied to this dashboard")

        # Check if field exists in dashboard
        field_exists = any(field["name"] == field_name for field in dashboard.get("fields", []))
        if not field_exists:
            raise HTTPException(status_code=404, detail="Field not found in dashboard")

        # Calculate time range
        end_time = datetime.now(IST_TIMEZONE)
        start_time = end_time - timedelta(hours=hours)

        # Fetch data points
        cursor = mongodb.get_collection("data_points").find({
            "dashboard_id": dashboard_id,
            "field_name": field_name,
            "timestamp": {"$gte": start_time, "$lte": end_time}
        }).sort("timestamp", -1).limit(limit)

        data_points = []
        try:
            async for doc in cursor:
                # Convert timestamp to IST and serialize as ISO string
                ts = doc["timestamp"]
                if ts.tzinfo is None:
                    # Treat naive datetime as UTC, then convert to IST
                    ts = ts.replace(tzinfo=timezone.utc).astimezone(IST_TIMEZONE)
                data_points.append(DataPointResponse(
                    id=str(doc["_id"]),
                    dashboard_id=doc["dashboard_id"],
                    field_name=doc["field_name"],
                    value=doc["value"],
                    timestamp=ts.isoformat(),
                    metadata=doc.get("metadata")
                ))
        except Exception as cursor_error:
            print(f"Error iterating cursor for dashboard {dashboard_id}, field {field_name}: {cursor_error}")
            # If there's an issue with data, it's better to return an empty array
            # or raise a more specific error, rather than a generic 500 if data is malformed.
            # For now, returning empty array as per original logic.
            return []

        # Reverse to get chronological order (oldest first)
        data_points.reverse()

        return data_points

    except HTTPException as http_exc:
        # Re-raise HTTPException directly
        raise http_exc
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR fetching data for dashboard {dashboard_id}, field {field_name}: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred while fetching field data: {str(e)}")

@router.get("/dashboard/{dashboard_id}/data", response_model=dict)
async def get_dashboard_data(
    dashboard_id: str,
    hours: int = Query(default=24, description="Number of hours to fetch data for"),
    limit: int = Query(default=100, description="Maximum number of data points per field"),
    current_user: User = Depends(get_current_user)
):
    """
    Get time-series data for all fields in a dashboard
    """
    try:
        # Validate dashboard exists and user has access
        dashboard = await mongodb.get_collection("dashboards").find_one({"_id": ObjectId(dashboard_id)})
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")

        # Check if user has access to this dashboard
        if not dashboard.get("is_public", False) and str(current_user.id) not in dashboard.get("assigned_users", []):
            raise HTTPException(status_code=403, detail="Access denied to this dashboard")

        # Calculate time range
        end_time = datetime.now(IST_TIMEZONE)
        start_time = end_time - timedelta(hours=hours)

        # Get all fields in the dashboard
        fields = dashboard.get("fields", [])
        result = {}

        for field in fields:
            field_name = field["name"]

            # Fetch data points for this field
            cursor = mongodb.get_collection("data_points").find({
                "dashboard_id": dashboard_id,
                "field_name": field_name,
                "timestamp": {"$gte": start_time, "$lte": end_time}
            }).sort("timestamp", -1).limit(limit)

            field_data = []
            async for doc in cursor:
                # Convert timestamp to IST and serialize as ISO string
                ts = doc["timestamp"]
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc).astimezone(IST_TIMEZONE)
                else:
                    ts = ts.astimezone(IST_TIMEZONE)
                field_data.append({
                    "id": str(doc["_id"]),
                    "value": doc["value"],
                    "timestamp": ts.isoformat(),
                    "metadata": doc.get("metadata")
                })

            # Reverse to get chronological order (oldest first)
            field_data.reverse()
            result[field_name] = field_data

        return {
            "dashboard_id": dashboard_id,
            "dashboard_name": dashboard["name"],
            "time_range": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "hours": hours
            },
            "fields": result
        }

    except HTTPException as http_exc:
        # Re-raise HTTPException directly
        raise http_exc
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR fetching data for dashboard {dashboard_id}: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred while fetching dashboard data: {str(e)}")

@router.post("/dashboard/{dashboard_id}/field/{field_name}/data")
async def add_data_point(
    dashboard_id: str,
    field_name: str,
    payload: DataPointCreate = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Add a data point for a specific field (for testing purposes or manual input, with required timestamp)
    """
    try:
        # Validate dashboard exists and user has access
        dashboard = await mongodb.get_collection("dashboards").find_one({"_id": ObjectId(dashboard_id)})
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")

        # Only allow admins to add previous data
        if not getattr(current_user, 'is_admin', False):
            raise HTTPException(status_code=403, detail="Only admins can add previous data points")

        # Check if field exists in dashboard
        field_exists = any(field["name"] == field_name for field in dashboard.get("fields", []))
        if not field_exists:
            raise HTTPException(status_code=404, detail="Field not found in dashboard")

        # Use provided timestamp
        data_point = {
            "dashboard_id": dashboard_id,
            "field_name": field_name,
            "value": float(payload.value),
            "timestamp": payload.timestamp,
            "metadata": {"source": "manual", "user_id": str(current_user.id)}
        }

        # Store in database
        result = await mongodb.get_collection("data_points").insert_one(data_point)

        # Update dashboard field with latest value if the timestamp is newer
        field_info = next((f for f in dashboard.get("fields", []) if f["name"] == field_name), None)
        if field_info is not None:
            last_update = field_info.get("last_update")
            payload_ts = payload.timestamp
            from datetime import timezone
            # Ensure both are timezone-aware (UTC)
            if last_update:
                if hasattr(last_update, 'tzinfo') and last_update.tzinfo is None:
                    last_update = last_update.replace(tzinfo=timezone.utc)
                if hasattr(payload_ts, 'tzinfo') and payload_ts.tzinfo is None:
                    payload_ts = payload_ts.replace(tzinfo=timezone.utc)
            if not last_update or payload_ts > last_update:
        await mongodb.get_collection("dashboards").update_one(
            {"_id": ObjectId(dashboard_id), "fields.name": field_name},
            {
                "$set": {
                            "fields.$.last_value": float(payload.value),
                            "fields.$.last_update": payload.timestamp,
                            "updated_at": payload.timestamp
                }
            }
        )

        return {
            "message": "Data point added successfully",
            "data_point_id": str(result.inserted_id),
            "value": payload.value,
            "timestamp": payload.timestamp.isoformat()
        }

    except HTTPException as http_exc:
        # Re-raise HTTPException directly
        raise http_exc
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR adding data point for dashboard {dashboard_id}, field {field_name}: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred while adding data point: {str(e)}")

@router.get("/test-data/{dashboard_id}")
async def test_dashboard_data(
    dashboard_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Test endpoint to check dashboard data and fields
    """
    try:
        # Check if dashboard exists
        dashboard = await mongodb.get_collection("dashboards").find_one({"_id": ObjectId(dashboard_id)})
        if not dashboard:
            return {"error": "Dashboard not found"}

        # Check fields
        fields = dashboard.get("fields", [])
        field_names = [field["name"] for field in fields]

        # Check data points for each field
        data_counts = {}
        for field_name in field_names:
            count = await mongodb.get_collection("data_points").count_documents({
                "dashboard_id": dashboard_id,
                "field_name": field_name
            })
            data_counts[field_name] = count

        return {
            "dashboard_id": dashboard_id,
            "dashboard_name": dashboard.get("name"),
            "fields": field_names,
            "data_counts": data_counts,
            "total_data_points": await mongodb.get_collection("data_points").count_documents({
                "dashboard_id": dashboard_id
            })
        }

    except HTTPException as http_exc:
        # Re-raise HTTPException directly
        raise http_exc
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR in test endpoint for dashboard {dashboard_id}: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred during test data retrieval: {str(e)}")

# The following code block was moved to device_ingest.py:
# IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))
# router = APIRouter()
# class DeviceIngestRequest(BaseModel):
#     dashboard_id: str
#     field_name: str
#     value: float
# @router.post("/device-ingest")
# async def device_ingest(
#     request: Request,
#     payload: DeviceIngestRequest
# ):
#     # ... (rest of the device ingest logic)
