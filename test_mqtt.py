#!/usr/bin/env python3
"""
Test script to simulate ESP8266 publishing data to MQTT
This helps verify that the MQTT service and TankManage backend are working correctly
"""

import paho.mqtt.client as mqtt
import json
import time
import random
import sys

# Configuration
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
DASHBOARD_ID = "685243c10325c40da1d4b468"  # Your testing dashboard ID
FIELD_NAMES = ["Temp", "Level", "ph", "Pressure"]
INTERVAL = 120  # 2 minutes in seconds

# Base values for realistic sensor data
BASE_VALUES = {
    "Temp": 25.0,      # Temperature in °C
    "Level": 65.0,     # Water level in %
    "ph": 7.2,         # pH level
    "Pressure": 1013.25  # Atmospheric pressure in hPa
}

# Max variations for each sensor
VARIATIONS = {
    "Temp": 2.0,       # ±2°C
    "Level": 10.0,     # ±10%
    "ph": 0.3,         # ±0.3 pH
    "Pressure": 50.0   # ±50 hPa
}

def on_connect(client, userdata, flags, rc):
    """Callback when connected to MQTT broker"""
    if rc == 0:
        print("Connected to MQTT broker successfully")
    else:
        print(f"Failed to connect to MQTT broker with code: {rc}")

def on_publish(client, userdata, mid):
    """Callback when message is published"""
    print(f"Message published with ID: {mid}")

def generate_sensor_data(field_name):
    """Generate realistic sensor data for each field"""
    base_value = BASE_VALUES[field_name]
    max_variation = VARIATIONS[field_name]
    
    # Add random variation around base value
    variation = random.uniform(-max_variation, max_variation)
    sensor_value = base_value + variation
    
    # Apply field-specific constraints
    if field_name == "Temp":
        sensor_value = max(15.0, min(35.0, sensor_value))  # 15-35°C
    elif field_name == "Level":
        sensor_value = max(0.0, min(100.0, sensor_value))  # 0-100%
    elif field_name == "ph":
        sensor_value = max(6.5, min(8.5, sensor_value))    # 6.5-8.5 pH
    elif field_name == "Pressure":
        sensor_value = max(950.0, min(1050.0, sensor_value))  # 950-1050 hPa
    
    return round(sensor_value, 2)

def main():
    # Create MQTT client
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_publish = on_publish
    
    # Connect to MQTT broker
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
    except Exception as e:
        print(f"Failed to connect to MQTT broker: {e}")
        sys.exit(1)
    
    print("ESP8266 TankManage Test Simulator")
    print(f"Dashboard ID: {DASHBOARD_ID}")
    print(f"Fields: {', '.join(FIELD_NAMES)}")
    print(f"Publishing every {INTERVAL} seconds")
    print("Press Ctrl+C to stop")
    print("-" * 60)
    
    try:
        while True:
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            print(f"\n[{timestamp}] Publishing sensor data:")
            
            # Generate and publish data for each field
            for field_name in FIELD_NAMES:
                sensor_value = generate_sensor_data(field_name)
                topic = f"tankmanage/{DASHBOARD_ID}/{field_name}"
                
                # Publish simple value
                value_message = str(sensor_value)
                result = client.publish(topic, value_message)
                
                print(f"  {field_name}: {sensor_value} -> {topic}")
                
                time.sleep(0.1)  # Small delay between publishes
            
            print("  All data published successfully")
            
            # Wait for next interval
            time.sleep(INTERVAL)
            
    except KeyboardInterrupt:
        print("\nStopping MQTT test simulator...")
        client.loop_stop()
        client.disconnect()
        print("Disconnected from MQTT broker")

if __name__ == "__main__":
    main() 