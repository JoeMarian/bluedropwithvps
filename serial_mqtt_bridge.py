#!/usr/bin/env python3
"""
Serial to MQTT Bridge for ESP8266
Reads sensor data from ESP8266 via serial and publishes to MQTT
"""

import serial
import paho.mqtt.client as mqtt
import time
import re
import sys

# Serial settings
SERIAL_PORT = '/dev/tty.usbserial-A5069RR4'  # Specific port for your ESP8266
SERIAL_BAUDRATE = 115200

# MQTT settings
MQTT_BROKER = "localhost"
MQTT_PORT = 1883

def on_connect(client, userdata, flags, rc):
    """Callback when connected to MQTT broker"""
    if rc == 0:
        print("Connected to MQTT broker successfully")
    else:
        print(f"Failed to connect to MQTT broker with code: {rc}")

def on_publish(client, userdata, mid):
    """Callback when message is published"""
    print(f"Message published with ID: {mid}")

def find_serial_port():
    """Find the correct serial port for ESP8266"""
    import glob
    import os
    
    # First try the specific port we found
    if os.path.exists(SERIAL_PORT):
        try:
            ser = serial.Serial(SERIAL_PORT, SERIAL_BAUDRATE, timeout=1)
            ser.close()
            print(f"Found ESP8266 on port: {SERIAL_PORT}")
            return SERIAL_PORT
        except:
            pass
    
    # Common patterns for ESP8266 serial ports
    patterns = [
        '/dev/tty.usbserial-*',
        '/dev/ttyUSB*',
        '/dev/tty.wchusbserial*',
        '/dev/tty.SLAB_USBtoUART*',
        'COM*'  # Windows
    ]
    
    for pattern in patterns:
        ports = glob.glob(pattern)
        for port in ports:
            try:
                # Try to open the port
                ser = serial.Serial(port, SERIAL_BAUDRATE, timeout=1)
                ser.close()
                print(f"Found ESP8266 on port: {port}")
                return port
            except:
                continue
    
    return None

def main():
    # Find ESP8266 serial port
    port = find_serial_port()
    if not port:
        print("ERROR: Could not find ESP8266 serial port")
        print("Please check:")
        print("1. ESP8266 is connected via USB")
        print("2. Arduino IDE can see the port")
        print("3. No other program is using the port")
        print(f"4. Expected port: {SERIAL_PORT}")
        sys.exit(1)
    
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
    
    # Open serial connection
    try:
        ser = serial.Serial(port, SERIAL_BAUDRATE, timeout=1)
        print(f"Connected to ESP8266 on {port}")
    except Exception as e:
        print(f"Failed to open serial port {port}: {e}")
        sys.exit(1)
    
    print("Serial to MQTT Bridge Started")
    print("Reading data from ESP8266 and publishing to MQTT...")
    print("Press Ctrl+C to stop")
    print("-" * 50)
    
    # Pattern to match: tankmanage/DASHBOARD_ID/FIELD_NAME:VALUE
    pattern = re.compile(r'tankmanage/([^/]+)/([^:]+):([\d.]+)')
    
    try:
        while True:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8').strip()
                
                if line:
                    print(f"Received: {line}")
                    
                    # Check if it's a data line
                    match = pattern.match(line)
                    if match:
                        dashboard_id = match.group(1)
                        field_name = match.group(2)
                        value = match.group(3)
                        
                        # Create MQTT topic
                        topic = f"tankmanage/{dashboard_id}/{field_name}"
                        
                        # Publish to MQTT
                        result = client.publish(topic, value)
                        if result.rc == mqtt.MQTT_ERR_SUCCESS:
                            print(f"  Published: {field_name} = {value} -> {topic}")
                        else:
                            print(f"  Failed to publish: {field_name} = {value}")
                    else:
                        # Print other messages (status, etc.)
                        print(f"  Info: {line}")
            
            time.sleep(0.1)  # Small delay
            
    except KeyboardInterrupt:
        print("\nStopping Serial to MQTT Bridge...")
        ser.close()
        client.loop_stop()
        client.disconnect()
        print("Bridge stopped")

if __name__ == "__main__":
    main() 