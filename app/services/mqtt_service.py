import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
import paho.mqtt.client as mqtt
from app.core.config import settings
from app.db.mongodb import mongodb
from bson import ObjectId
import motor.motor_asyncio
import os

logger = logging.getLogger(__name__)

# IST timezone (UTC+5:30)
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

class MQTTService:
    def __init__(self):
        self.client = mqtt.Client()
        # Set username and password from environment or settings
        username = getattr(settings, 'MQTT_USERNAME', os.getenv('MQTT_USERNAME', ''))
        password = getattr(settings, 'MQTT_PASSWORD', os.getenv('MQTT_PASSWORD', ''))
        if username and password:
            logger.warning(f"MQTT DEBUG: username={username!r}, password={password!r}")
            #raise Exception("MQTTService __init__ called")
            self.client.username_pw_set(username, password)
        # Use default settings for local Mosquitto
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect
        
    def start(self):
        """Start the MQTT service"""
        try:
            # Connect to local Mosquitto broker
            broker = getattr(settings, 'MQTT_BROKER', 'localhost')
            port = getattr(settings, 'MQTT_PORT', 1883)
            
            self.client.connect(broker, port, 60)
            self.client.loop_start()
            
            logger.info(f"MQTT service started successfully on {broker}:{port}")
        except Exception as e:
            logger.error(f"Failed to start MQTT service: {e}")
            raise
    
    def stop(self):
        """Stop the MQTT service"""
        try:
            self.client.loop_stop()
            self.client.disconnect()
            logger.info("MQTT service stopped")
        except Exception as e:
            logger.error(f"Error stopping MQTT service: {e}")
    
    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            logger.info("Connected to MQTT broker")
            # Subscribe to TankManage topics
            client.subscribe("tankmanage/+/+")  # tankmanage/dashboard_id/field_name
            client.subscribe("tankmanage/+/+/+")  # tankmanage/dashboard_id/field_name/data
        else:
            logger.error(f"Failed to connect to MQTT broker with code: {rc}")
    
    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        if rc != 0:
            logger.warning(f"Unexpected disconnection from MQTT broker with code: {rc}")
        else:
            logger.info("Disconnected from MQTT broker")
    
    def on_message(self, client, userdata, msg):
        """Callback when message is received from MQTT broker"""
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            
            logger.info(f"Received message on topic {topic}: {payload}")
            
            # Parse topic: tankmanage/{dashboard_id}/{field_name}
            topic_parts = topic.split('/')
            
            if len(topic_parts) >= 3 and topic_parts[0] == 'tankmanage':
                dashboard_id = topic_parts[1]
                field_name = topic_parts[2]
                
                # Try to parse as float value
                try:
                    value = float(payload)
                    # Process data synchronously to avoid event loop issues
                    self.process_field_data_sync(dashboard_id, field_name, value)
                except ValueError:
                    logger.error(f"Invalid payload format: {payload}")
                    return
                    
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")
    
    def process_field_data_sync(self, dashboard_id: str, field_name: str, value: float):
        """Process data for a single field synchronously"""
        try:
            # Use synchronous MongoDB operations
            from pymongo import MongoClient
            
            # Get MongoDB connection string from settings
            mongo_url = getattr(settings, 'MONGODB_URI', 'mongodb://localhost:27017/thingspeak_clone')
            client = MongoClient(mongo_url)
            db = client.thingspeak_clone  # Use the correct database name
            
            # Validate dashboard and field exist
            dashboard = db.dashboards.find_one({"_id": ObjectId(dashboard_id)})
            if not dashboard:
                logger.warning(f"Dashboard {dashboard_id} not found")
                return
            
            # Check if field exists in dashboard
            field_exists = any(field["name"] == field_name for field in dashboard.get("fields", []))
            if not field_exists:
                logger.warning(f"Field {field_name} not found in dashboard {dashboard_id}")
                return
            
            # Create data point with IST timestamp
            current_time_ist = datetime.now(IST_TIMEZONE)
            data_point = {
                "dashboard_id": dashboard_id,
                "field_name": field_name,
                "value": float(value),
                "timestamp": current_time_ist,
                "metadata": {"source": "mqtt", "topic": f"tankmanage/{dashboard_id}/{field_name}"}
            }
            
            # Store in database
            result = db.data_points.insert_one(data_point)
            
            # Update dashboard field with latest value
            db.dashboards.update_one(
                {"_id": ObjectId(dashboard_id), "fields.name": field_name},
                {
                    "$set": {
                        "fields.$.last_value": float(value),
                        "fields.$.last_update": current_time_ist,
                        "updated_at": current_time_ist
                    }
                }
            )
            
            logger.info(f"Stored data point: {result.inserted_id} for field {field_name} in dashboard {dashboard_id}")
            
            # Close connection
            client.close()
            
        except Exception as e:
            logger.error(f"Error processing field data: {e}")

# Global MQTT service instance
mqtt_service = MQTTService()

def start_mqtt_service():
    """Start the MQTT service"""
    mqtt_service.start()

def stop_mqtt_service():
    """Stop the MQTT service"""
    mqtt_service.stop() 