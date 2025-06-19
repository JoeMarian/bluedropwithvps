# ESP8266 Setup Guide for TankManage

This guide will help you set up an ESP8266 to send sensor data to TankManage via MQTT.

## Prerequisites

1. **Hardware Required:**
   - ESP8266 (NodeMCU, Wemos D1 Mini, or similar)
   - USB cable for programming
   - Computer with Arduino IDE

2. **Software Required:**
   - Arduino IDE
   - ESP8266 board package
   - PubSubClient library

## Step 1: Install Arduino IDE and Libraries

1. **Download Arduino IDE** from https://www.arduino.cc/en/software
2. **Install ESP8266 Board Package:**
   - Open Arduino IDE
   - Go to File → Preferences
   - Add this URL to "Additional Board Manager URLs": `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
   - Go to Tools → Board → Board Manager
   - Search for "ESP8266" and install "ESP8266 by ESP8266 Community"

3. **Install PubSubClient Library:**
   - Go to Tools → Manage Libraries
   - Search for "PubSubClient" by Nick O'Leary
   - Install the library

## Step 2: Configure the ESP8266 Code

1. **Open the ESP8266 sketch:**
   - Use `esp8266_tankmanage_simple.ino` for basic setup
   - Use `esp8266_tankmanage.ino` for advanced JSON payload

2. **Update Configuration:**
   ```cpp
   // WiFi credentials
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   
   // MQTT Broker settings
   const char* mqtt_server = "YOUR_MQTT_BROKER_IP";  // Your computer's IP address
   const int mqtt_port = 1883;
   
   // TankManage settings
   const char* dashboard_id = "YOUR_DASHBOARD_ID";  // From TankManage dashboard
   const char* field_name = "water_level";  // Field name in your dashboard
   ```

## Step 3: Get Your Dashboard ID

1. **Create a dashboard in TankManage** (if you haven't already)
2. **Get the Dashboard ID:**
   - Open your dashboard in TankManage
   - Look at the URL: `https://tankmanage.teamskrn.xyz/dashboard/DASHBOARD_ID`
   - Copy the DASHBOARD_ID part

## Step 4: Set Up MQTT Broker

### Option A: Local Mosquitto (Recommended)

1. **Install Mosquitto on your computer:**
   ```bash
   # macOS
   brew install mosquitto
   
   # Ubuntu/Debian
   sudo apt-get install mosquitto mosquitto-clients
   
   # Windows
   # Download from https://mosquitto.org/download/
   ```

2. **Start Mosquitto:**
   ```bash
   # macOS/Linux
   mosquitto
   
   # Or as a service
   sudo systemctl start mosquitto
   ```

3. **Test MQTT connection:**
   ```bash
   # Subscribe to test topic
   mosquitto_sub -h localhost -t "test/topic"
   
   # In another terminal, publish a message
   mosquitto_pub -h localhost -t "test/topic" -m "Hello MQTT"
   ```

### Option B: Cloud MQTT (Alternative)

1. **Sign up for a free MQTT broker** like:
   - HiveMQ Cloud (free tier)
   - CloudMQTT (free tier)
   - EMQ X Cloud (free tier)

2. **Update the ESP8266 code with cloud broker details**

## Step 5: Configure Network Settings

1. **Find your computer's IP address:**
   ```bash
   # macOS/Linux
   ifconfig
   
   # Windows
   ipconfig
   ```

2. **Update the ESP8266 code:**
   ```cpp
   const char* mqtt_server = "192.168.1.100";  // Your computer's IP
   ```

3. **Ensure ESP8266 and computer are on the same network**

## Step 6: Upload and Test

1. **Connect ESP8266 to computer via USB**
2. **Select correct board in Arduino IDE:**
   - Tools → Board → ESP8266 Boards → NodeMCU 1.0 (ESP-12E Module)
3. **Select correct port**
4. **Upload the code**
5. **Open Serial Monitor** (Tools → Serial Monitor)
6. **Set baud rate to 115200**

## Step 7: Verify Data Flow

1. **Check Serial Monitor output:**
   ```
   ESP8266 TankManage Sensor Node
   Dashboard ID: your_dashboard_id
   Field Name: water_level
   MQTT Topic: tankmanage/your_dashboard_id/water_level
   Connecting to WiFi...
   WiFi connected
   IP address: 192.168.1.101
   Attempting MQTT connection...
   connected
   Publishing value: 45.67
   Message published successfully
   ```

2. **Check TankManage dashboard** - you should see data appearing every 2 minutes

3. **Monitor MQTT messages:**
   ```bash
   mosquitto_sub -h localhost -t "tankmanage/#" -v
   ```

## Troubleshooting

### Common Issues:

1. **ESP8266 won't connect to WiFi:**
   - Check SSID and password
   - Ensure WiFi network is 2.4GHz (ESP8266 doesn't support 5GHz)

2. **MQTT connection fails:**
   - Check MQTT broker IP address
   - Ensure Mosquitto is running
   - Check firewall settings

3. **No data in TankManage:**
   - Verify dashboard ID is correct
   - Check field name matches exactly
   - Ensure TankManage backend is running

4. **Compilation errors:**
   - Install required libraries
   - Select correct board type
   - Check Arduino IDE version compatibility

### Debug Commands:

```bash
# Test MQTT broker
mosquitto_pub -h localhost -t "tankmanage/test/water_level" -m "50.5"

# Monitor all TankManage topics
mosquitto_sub -h localhost -t "tankmanage/#" -v

# Check Mosquitto logs
tail -f /var/log/mosquitto/mosquitto.log
```

## Advanced Configuration

### Multiple Sensors:

To send data for multiple fields, create multiple topics:

```cpp
// In your ESP8266 code
const char* field_names[] = {"water_level", "temperature", "ph_level"};
const int num_fields = 3;

// In the loop function
for (int i = 0; i < num_fields; i++) {
    sprintf(mqtt_topic, "tankmanage/%s/%s", dashboard_id, field_names[i]);
    float sensorValue = generateSensorDataForField(i);
    String valueString = String(sensorValue, 2);
    client.publish(mqtt_topic, valueString.c_str());
}
```

### Real Sensor Integration:

Replace the `generateSensorData()` function with actual sensor readings:

```cpp
float readWaterLevel() {
    // Read from ultrasonic sensor, float sensor, etc.
    return analogRead(A0) * (100.0 / 1023.0); // Convert to percentage
}
```

## Security Considerations

1. **Use MQTT authentication** for production
2. **Use SSL/TLS** for secure communication
3. **Change default passwords**
4. **Use strong WiFi passwords**
5. **Consider using a dedicated network** for IoT devices

## Next Steps

Once your ESP8266 is working:

1. **Add real sensors** (ultrasonic, temperature, pH, etc.)
2. **Implement error handling** and retry logic
3. **Add OTA (Over-The-Air) updates**
4. **Implement deep sleep** for battery optimization
5. **Add multiple ESP8266 nodes** for different tanks/locations 