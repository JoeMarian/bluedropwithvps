from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from app.schemas.dashboard import Dashboard, DashboardCreate, DashboardUpdate, DashboardData
from app.schemas.user import User
from app.api.deps import get_current_user
from app.db.mongodb import mongodb
from app.services.email_service import email_service
import random
import string
from datetime import datetime, timezone, timedelta
import json
from bson import ObjectId

# IST timezone (UTC+5:30)
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

router = APIRouter(prefix="/dashboards", tags=["dashboards"])

def datetime_handler(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

@router.post("/")
async def create_dashboard(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Create a new dashboard (channel)"""
    try:
        # Get raw request body for debugging
        body = await request.body()
        print("Raw request body:", body.decode())
        
        # Check content type and parse accordingly
        content_type = request.headers.get("content-type", "")
        
        if "application/json" in content_type:
            # Parse JSON data
            data = await request.json()
        else:
            # Parse form data
            form_data = await request.form()
            data = {}
            
            # Parse basic fields
            data["name"] = form_data.get("name", "")
            data["description"] = form_data.get("description", "")
            data["is_public"] = form_data.get("is_public", "false").lower() == "true"
            
            # Parse fields array
            fields = []
            field_index = 0
            while f"fields[{field_index}][name]" in form_data:
                field = {
                    "name": form_data.get(f"fields[{field_index}][name]", ""),
                    "type": form_data.get(f"fields[{field_index}][type]", "number"),
                    "unit": form_data.get(f"fields[{field_index}][unit]", ""),
                }
                value = form_data.get(f"fields[{field_index}][value]", "")
                if value:
                    try:
                        field["value"] = float(value)
                    except ValueError:
                        field["value"] = None
                else:
                    field["value"] = None
                fields.append(field)
                field_index += 1
            data["fields"] = fields
            
            # Parse widgets array
            widgets = []
            widget_index = 0
            while f"widgets[{widget_index}][id]" in form_data:
                widget = {
                    "id": form_data.get(f"widgets[{widget_index}][id]", ""),
                    "type": form_data.get(f"widgets[{widget_index}][type]", ""),
                    "title": form_data.get(f"widgets[{widget_index}][title]", ""),
                    "field": form_data.get(f"widgets[{widget_index}][field]", ""),
                }
                
                # Add optional widget fields
                if f"widgets[{widget_index}][chartType]" in form_data:
                    widget["chartType"] = form_data.get(f"widgets[{widget_index}][chartType]", "")
                if f"widgets[{widget_index}][timeRange]" in form_data:
                    widget["timeRange"] = form_data.get(f"widgets[{widget_index}][timeRange]", "")
                if f"widgets[{widget_index}][aggregationInterval]" in form_data:
                    widget["aggregationInterval"] = form_data.get(f"widgets[{widget_index}][aggregationInterval]", "")
                if f"widgets[{widget_index}][unit]" in form_data:
                    widget["unit"] = form_data.get(f"widgets[{widget_index}][unit]", "")
                
                widgets.append(widget)
                widget_index += 1
            data["widgets"] = widgets
            
            # Parse assigned_users array
            assigned_users = []
            user_index = 0
            while f"assigned_users[{user_index}]" in form_data:
                user_id = form_data.get(f"assigned_users[{user_index}]", "")
                if user_id:
                    assigned_users.append(user_id)
                user_index += 1
            data["assigned_users"] = assigned_users
        
        print("Parsed request data:", json.dumps(data, indent=2))
        
        # Check for duplicate dashboard name (case-insensitive)
        existing_dashboard = await mongodb.get_collection("dashboards").find_one({"name": {"$regex": f"^{data['name']}$", "$options": "i"}})
        if existing_dashboard:
            raise HTTPException(status_code=400, detail="Dashboard name already exists. Please choose a different name.")
        
        # Generate a 12-character API key
        api_key = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        now = datetime.now(IST_TIMEZONE)
        
        # Create channel document
        channel_data = {
            "name": data["name"],
            "description": data.get("description", ""),
            "fields": [
                {
                    "name": field["name"],
                    "type": field["type"],
                    "unit": field.get("unit"),
                    "value": field.get("value"),
                    "last_value": field.get("value") if field.get("value") is not None else None
                } for field in data.get("fields", [])
            ],
            "api_key": api_key,
            "created_by": str(current_user.id),
            "created_at": now,
            "updated_at": now
        }
        
        print("Creating channel with data:", json.dumps(channel_data, indent=2, default=datetime_handler))
        
        # Insert into channels collection
        result = await mongodb.get_collection("channels").insert_one(channel_data)
        channel_data["_id"] = str(result.inserted_id)
        
        # Also create a dashboard document for UI management
        dashboard_data = {
            "name": data["name"],
            "description": data.get("description", ""),
            "is_public": data.get("is_public", False),
            "created_by": str(current_user.id),
            "assigned_users": data.get("assigned_users", []),
            "fields": [
                {
                    **field,
                    "last_value": field.get("value") if field.get("value") is not None else None
                } for field in data.get("fields", [])
            ],
            "widgets": data.get("widgets", []),
            "api_key": api_key,
            "created_at": now,
            "updated_at": now
        }
        
        # Insert dashboard and get its ID
        dashboard_result = await mongodb.get_collection("dashboards").insert_one(dashboard_data)
        dashboard_data["_id"] = str(dashboard_result.inserted_id)
        
        # Convert datetime objects to ISO format strings for JSON response
        response_data = {
            **dashboard_data,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        # Send email notification to assigned users
        assigned_users = data.get("assigned_users", [])
        if assigned_users:
            try:
                # Get user details for email sending
                for user_id in assigned_users:
                    user = await mongodb.get_collection("users").find_one({"_id": ObjectId(user_id)})
                    if user and user.get("is_verified", False) and user.get("is_approved", False):
                        email_sent = email_service.send_dashboard_assignment_email(
                            user["email"],
                            user["username"],
                            data["name"],
                            api_key
                        )
                        if not email_sent:
                            print(f"Failed to send dashboard assignment email to {user['email']}")
            except Exception as e:
                print(f"Error sending dashboard assignment emails: {str(e)}")
                # Don't fail the dashboard creation if email sending fails
        
        return response_data
    except Exception as e:
        print("Error creating dashboard:", str(e))
        print("Error type:", type(e))
        import traceback
        print("Traceback:", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create dashboard: {str(e)}"
        )

@router.get("/")
async def get_dashboards(
    current_user: User = Depends(get_current_user)
):
    """Get all dashboards"""
    try:
        print("Getting dashboards for user:", str(current_user.id))
        
        # Get all dashboards
        cursor = mongodb.get_collection("dashboards").find({})
        dashboards = await cursor.to_list(length=None)
        print("Found dashboards:", len(dashboards))
        
        result = []
        # Convert ObjectId to string for each dashboard
        for dashboard in dashboards:
            print("Processing dashboard:", dashboard.get("name"))
            print("Original _id:", dashboard.get("_id"))
            print("Original _id type:", type(dashboard.get("_id")))
            
            # Keep the _id field as is, just convert to string
            if "_id" in dashboard:
                dashboard["_id"] = str(dashboard["_id"])
                print("Converted _id:", dashboard["_id"])
            else:
                print("Warning: Dashboard missing _id:", dashboard.get("name"))
                continue  # Skip dashboards without _id
            
            # Convert created_at and updated_at to IST ISO strings
            if "created_at" in dashboard:
                ts = dashboard["created_at"]
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc).astimezone(IST_TIMEZONE)
                else:
                    ts = ts.astimezone(IST_TIMEZONE)
                dashboard["created_at"] = ts.isoformat()
            if "updated_at" in dashboard:
                ts = dashboard["updated_at"]
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc).astimezone(IST_TIMEZONE)
                else:
                    ts = ts.astimezone(IST_TIMEZONE)
                dashboard["updated_at"] = ts.isoformat()
            
            result.append(dashboard)
        
        print("Returning dashboards:", len(result))
        return result
    except Exception as e:
        print("Error getting dashboards:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get dashboards: {str(e)}"
        )

@router.get("/my-dashboards")
async def get_my_dashboards(
    current_user: User = Depends(get_current_user)
):
    """Get dashboards assigned to the current user (public dashboards + assigned dashboards)"""
    try:
        print("Getting dashboards for user:", str(current_user.id))
        
        # Get dashboards that are either public or assigned to this user
        cursor = mongodb.get_collection("dashboards").find({
            "$or": [
                {"is_public": True},
                {"assigned_users": str(current_user.id)},
                {"created_by": str(current_user.id)}
            ]
        })
        dashboards = await cursor.to_list(length=None)
        print("Found dashboards for user:", len(dashboards))
        
        result = []
        # Convert ObjectId to string for each dashboard
        for dashboard in dashboards:
            print("Processing dashboard:", dashboard.get("name"))
            
            # Keep the _id field as is, just convert to string
            if "_id" in dashboard:
                dashboard["_id"] = str(dashboard["_id"])
            else:
                print("Warning: Dashboard missing _id:", dashboard.get("name"))
                continue  # Skip dashboards without _id
            
            # Process fields to map last_value to value for frontend
            if "fields" in dashboard:
                for field in dashboard["fields"]:
                    if "last_value" in field and field["last_value"] is not None:
                        field["value"] = field["last_value"]
                    else:
                        field["value"] = None
            
            # Convert created_at and updated_at to IST ISO strings
            if "created_at" in dashboard:
                ts = dashboard["created_at"]
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc).astimezone(IST_TIMEZONE)
                else:
                    ts = ts.astimezone(IST_TIMEZONE)
                dashboard["created_at"] = ts.isoformat()
            if "updated_at" in dashboard:
                ts = dashboard["updated_at"]
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc).astimezone(IST_TIMEZONE)
                else:
                    ts = ts.astimezone(IST_TIMEZONE)
                dashboard["updated_at"] = ts.isoformat()
            
            result.append(dashboard)
        
        print("Returning user dashboards:", len(result))
        return result
    except Exception as e:
        print("Error getting user dashboards:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get user dashboards: {str(e)}"
        )

@router.get("/{dashboard_id}", response_model=Dashboard)
async def get_dashboard(
    dashboard_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific dashboard"""
    try:
        # Convert string ID to ObjectId
        try:
            object_id = ObjectId(dashboard_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid dashboard ID format")
        
        dashboard = await mongodb.get_collection("dashboards").find_one({"_id": object_id})
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        # Check if user has access
        if (str(dashboard["created_by"]) != str(current_user.id) and 
            str(current_user.id) not in dashboard["assigned_users"] and 
            not dashboard["is_public"]):
            raise HTTPException(status_code=403, detail="Not authorized to access this dashboard")
        
        # Process fields to map last_value to value for frontend
        if "fields" in dashboard:
            for field in dashboard["fields"]:
                if "last_value" in field and field["last_value"] is not None:
                    field["value"] = field["last_value"]
                else:
                    field["value"] = None
        
        # Convert created_at and updated_at to IST ISO strings
        if "created_at" in dashboard:
            ts = dashboard["created_at"]
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc).astimezone(IST_TIMEZONE)
            else:
                ts = ts.astimezone(IST_TIMEZONE)
            dashboard["created_at"] = ts.isoformat()
        if "updated_at" in dashboard:
            ts = dashboard["updated_at"]
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc).astimezone(IST_TIMEZONE)
            else:
                ts = ts.astimezone(IST_TIMEZONE)
            dashboard["updated_at"] = ts.isoformat()
        
        return Dashboard(**{**dashboard, "_id": str(dashboard["_id"])})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch dashboard: {str(e)}"
        )

@router.put("/{dashboard_id}", response_model=Dashboard)
async def update_dashboard(
    dashboard_id: str,
    dashboard_update: DashboardUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a dashboard"""
    try:
        # Convert string ID to ObjectId
        try:
            object_id = ObjectId(dashboard_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid dashboard ID format")
        
        # Check if dashboard exists and user has access
        dashboard = await mongodb.get_collection("dashboards").find_one({"_id": object_id})
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        if str(dashboard["created_by"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to update this dashboard")
        
        # Get current assigned users
        current_assigned_users = set(dashboard.get("assigned_users", []))
        
        # Update dashboard
        update_data = dashboard_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.now(IST_TIMEZONE)
        
        # Ensure last_value is updated for each field if value is present
        if "fields" in update_data:
            new_fields = []
            for field in update_data["fields"]:
                new_field = dict(field)
                if "value" in new_field and new_field["value"] is not None:
                    new_field["last_value"] = new_field["value"]
                    # Insert a new data point for this field
                    await mongodb.get_collection("data_points").insert_one({
                        "dashboard_id": str(object_id),
                        "field_name": new_field["name"],
                        "value": new_field["value"],
                        "timestamp": datetime.now(IST_TIMEZONE),
                        "metadata": {"source": "dashboard_update"}
                    })
                new_fields.append(new_field)
            update_data["fields"] = new_fields
        
        await mongodb.get_collection("dashboards").update_one(
            {"_id": object_id},
            {"$set": update_data}
        )
        
        # Check for new assigned users and send emails
        new_assigned_users = set(update_data.get("assigned_users", [])) - current_assigned_users
        if new_assigned_users:
            try:
                # Get dashboard details for email
                updated_dashboard = await mongodb.get_collection("dashboards").find_one({"_id": object_id})
                dashboard_name = updated_dashboard.get("name", "Unknown Dashboard")
                api_key = updated_dashboard.get("api_key", "")
                
                # Send emails to newly assigned users
                for user_id in new_assigned_users:
                    user = await mongodb.get_collection("users").find_one({"_id": ObjectId(user_id)})
                    if user and user.get("is_verified", False) and user.get("is_approved", False):
                        email_sent = email_service.send_dashboard_assignment_email(
                            user["email"],
                            user["username"],
                            dashboard_name,
                            api_key
                        )
                        if not email_sent:
                            print(f"Failed to send dashboard assignment email to {user['email']}")
            except Exception as e:
                print(f"Error sending dashboard assignment emails: {str(e)}")
                # Don't fail the update if email sending fails
        
        updated_dashboard = await mongodb.get_collection("dashboards").find_one({"_id": object_id})
        # Convert created_at and updated_at to IST ISO strings
        if "created_at" in updated_dashboard:
            ts = updated_dashboard["created_at"]
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc).astimezone(IST_TIMEZONE)
            else:
                ts = ts.astimezone(IST_TIMEZONE)
            updated_dashboard["created_at"] = ts.isoformat()
        if "updated_at" in updated_dashboard:
            ts = updated_dashboard["updated_at"]
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc).astimezone(IST_TIMEZONE)
            else:
                ts = ts.astimezone(IST_TIMEZONE)
            updated_dashboard["updated_at"] = ts.isoformat()
        return Dashboard(**{**updated_dashboard, "_id": str(updated_dashboard["_id"])})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update dashboard: {str(e)}"
        )

@router.delete("/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a dashboard"""
    try:
        print("Delete request received for dashboard_id:", dashboard_id)
        print("Dashboard_id type:", type(dashboard_id))
        print("Dashboard_id length:", len(dashboard_id) if dashboard_id else "None")
        
        # Convert string ID to ObjectId
        try:
            object_id = ObjectId(dashboard_id)
            print("Converted to ObjectId:", object_id)
        except Exception as e:
            print("Error converting to ObjectId:", str(e))
            raise HTTPException(status_code=400, detail="Invalid dashboard ID format")
        
        # Check if dashboard exists and user has access
        dashboard = await mongodb.get_collection("dashboards").find_one({"_id": object_id})
        if not dashboard:
            print("Dashboard not found in database")
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        print("Found dashboard:", dashboard.get("name"))
        
        if str(dashboard["created_by"]) != str(current_user.id):
            print("User not authorized to delete this dashboard")
            raise HTTPException(status_code=403, detail="Not authorized to delete this dashboard")
        
        # Delete from both collections
        await mongodb.get_collection("dashboards").delete_one({"_id": object_id})
        
        # Also delete from channels collection if it exists
        await mongodb.get_collection("channels").delete_one({"api_key": dashboard.get("api_key")})
        
        print("Dashboard deleted successfully")
        return {"message": "Dashboard deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print("Error deleting dashboard:", str(e))
        import traceback
        print("Traceback:", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete dashboard: {str(e)}"
        ) 