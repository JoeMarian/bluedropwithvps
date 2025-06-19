#!/usr/bin/env python3
"""
Test script to add sample data points to test the time-series functionality
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone
from app.db.mongodb import mongodb
from app.core.config import settings

async def add_sample_data():
    """Add sample data points to test the system"""
    await mongodb.connect_to_mongodb()
    
    # Get the first dashboard (assuming it exists)
    dashboard = await mongodb.get_collection("dashboards").find_one()
    if not dashboard:
        print("No dashboard found. Please create a dashboard first.")
        return
    
    dashboard_id = str(dashboard["_id"])
    print(f"Adding sample data to dashboard: {dashboard['name']}")
    
    # Get fields from the dashboard
    fields = dashboard.get("fields", [])
    if not fields:
        print("No fields found in dashboard. Please add fields first.")
        return
    
    # Generate sample data for the last 24 hours
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(hours=24)
    
    # Generate data points every 15 minutes
    current_time = start_time
    data_points = []
    
    while current_time <= end_time:
        for field in fields:
            field_name = field["name"]
            
            # Generate realistic values based on field type
            if "temperature" in field_name.lower():
                base_value = 25.0
                variation = 5.0
            elif "humidity" in field_name.lower():
                base_value = 60.0
                variation = 20.0
            elif "pressure" in field_name.lower():
                base_value = 1013.25
                variation = 10.0
            elif "level" in field_name.lower():
                base_value = 50.0
                variation = 30.0
            else:
                base_value = 100.0
                variation = 50.0
            
            # Add some realistic variation with time
            time_factor = (current_time - start_time).total_seconds() / 3600  # hours
            value = base_value + variation * (0.5 + 0.5 * (time_factor % 24) / 24) + random.uniform(-5, 5)
            
            data_point = {
                "dashboard_id": dashboard_id,
                "field_name": field_name,
                "value": round(value, 2),
                "timestamp": current_time,
                "metadata": {
                    "source": "test_script",
                    "test_data": True
                }
            }
            data_points.append(data_point)
        
        current_time += timedelta(minutes=15)
    
    # Insert all data points
    if data_points:
        result = await mongodb.get_collection("data_points").insert_many(data_points)
        print(f"Added {len(result.inserted_ids)} data points")
        
        # Update dashboard fields with latest values
        for field in fields:
            field_name = field["name"]
            latest_data = await mongodb.get_collection("data_points").find_one(
                {"dashboard_id": dashboard_id, "field_name": field_name},
                sort=[("timestamp", -1)]
            )
            
            if latest_data:
                await mongodb.get_collection("dashboards").update_one(
                    {"_id": dashboard["_id"], "fields.name": field_name},
                    {
                        "$set": {
                            "fields.$.last_value": latest_data["value"],
                            "fields.$.last_update": latest_data["timestamp"],
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
        
        print("Dashboard fields updated with latest values")
    else:
        print("No data points to add")
    
    await mongodb.close_mongodb_connection()

if __name__ == "__main__":
    asyncio.run(add_sample_data()) 