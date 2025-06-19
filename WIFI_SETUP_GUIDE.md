# ESP8266 WiFi + MQTT Setup Guide

## 🎯 **Goal**
Set up ESP8266 to connect to WiFi and publish sensor data directly to MQTT broker, eliminating the need for USB connection and Python bridge.

## 📋 **Prerequisites**
- ESP8266 (NodeMCU, Wemos D1 Mini, etc.)
- Arduino IDE with ESP8266 board package
- PubSubClient library
- WiFi network (2.4GHz - ESP8266 doesn't support 5GHz)
- Computer running Mosquitto MQTT broker

## 🔧 **Step 1: Update ESP8266 Code**

### Open `esp8266_wifi_mqtt.ino` in Arduino IDE

### Update Configuration:
```cpp
// WiFi credentials - UPDATE THESE WITH YOUR NETWORK DETAILS
const char* ssid = "YOUR_WIFI_SSID";           // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";   // Your WiFi password

// MQTT Broker settings - UPDATE WITH YOUR COMPUTER'S IP ADDRESS
const char* mqtt_server = "10.45.13.149";      // Your computer's IP address
const int mqtt_port = 1883;
```

## 📡 **Step 2: Network Configuration**

### Your Computer's IP Address: `10.45.13.149`

### Ensure ESP8266 and Computer are on Same Network:
- Both devices must be connected to the same WiFi network
- Check that your computer's firewall allows MQTT traffic (port 1883)

### Test Network Connectivity:
```bash
# From your computer, test if ESP8266 can reach your computer
ping 10.45.13.149
```

## 🚀 **Step 3: Upload and Test**

### 1. **Upload Code to ESP8266:**
- Connect ESP8266 to computer via USB
- Select board: **NodeMCU 1.0 (ESP-12E Module)**
- Select correct port
- Upload the code

### 2. **Monitor Serial Output:**
Open Serial Monitor (115200 baud) to see:
```
ESP8266 TankManage WiFi + MQTT Node
Dashboard ID: 685243c10325c40da1d4b468
Fields:
  Temp: tankmanage/685243c10325c40da1d4b468/Temp
  Level: tankmanage/685243c10325c40da1d4b468/Level
  ph: tankmanage/685243c10325c40da1d4b468/ph
  Pressure: tankmanage/685243c10325c40da1d4b468/Pressure
Connecting to YOUR_WIFI_SSID
WiFi connected
IP address: 10.45.13.150
Attempting MQTT connection...
connected
--- Publishing sensor data ---
Temp: 26.45 -> tankmanage/685243c10325c40da1d4b468/Temp
  Published successfully
Level: 72.30 -> tankmanage/685243c10325c40da1d4b468/Level
  Published successfully
ph: 7.35 -> tankmanage/685243c10325c40da1d4b468/ph
  Published successfully
Pressure: 1018.75 -> tankmanage/685243c10325c40da1d4b468/Pressure
  Published successfully
--- Data publishing complete ---
```

## 🔍 **Step 4: Verification**

### 1. **Check MQTT Messages:**
```bash
# Monitor MQTT messages on your computer
mosquitto_sub -h localhost -t "tankmanage/#" -v
```

### 2. **Check TankManage Dashboard:**
- Open: https://tankmanage.teamskrn.xyz/dashboard/685243c10325c40da1d4b468
- You should see data updating every 2 minutes

### 3. **Check Backend Logs:**
Look for MQTT service logs showing data reception.

## 🔧 **Step 5: Disconnect USB (Optional)**

### Once WiFi is working:
1. **Power ESP8266 externally** (USB power bank, wall adapter, etc.)
2. **Disconnect USB cable**
3. **ESP8266 will continue sending data wirelessly**

## 🎯 **Expected Results**

### Serial Monitor Output:
- WiFi connection successful
- MQTT connection successful
- Data publishing every 2 minutes
- Realistic sensor values for all 4 fields

### TankManage Dashboard:
- **Fields section**: Shows current values (not N/A)
- **Widgets section**: Real-time charts and displays
- **Data updates**: Every 2 minutes automatically

## 🔍 **Troubleshooting**

### WiFi Connection Issues:
```cpp
// Check WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";        // Must be exact
const char* password = "YOUR_WIFI_PASSWORD"; // Must be exact

// Ensure 2.4GHz network (not 5GHz)
// Check WiFi signal strength
```

### MQTT Connection Issues:
```cpp
// Check MQTT broker IP
const char* mqtt_server = "10.45.13.149"; // Your computer's IP

// Verify Mosquitto is running
brew services list | grep mosquitto

// Check firewall settings
// Ensure ESP8266 and computer are on same network
```

### No Data in Dashboard:
- Verify dashboard ID is correct
- Check field names match exactly
- Monitor MQTT messages: `mosquitto_sub -h localhost -t "tankmanage/#" -v`
- Check backend logs for MQTT reception

### Common Error Codes:
- **WiFi**: Check SSID/password
- **MQTT rc=2**: Wrong IP address
- **MQTT rc=3**: Network connectivity issue
- **MQTT rc=5**: Authentication required (not configured)

## 🚀 **Advanced Configuration**

### Change Data Interval:
```cpp
const long interval = 60000; // 1 minute instead of 2 minutes
```

### Modify Sensor Ranges:
```cpp
// Base values for realistic sensor data
float base_values[] = {25.0, 65.0, 7.2, 1013.25}; // Temp, Level, ph, Pressure
float variations[] = {2.0, 10.0, 0.3, 50.0}; // Max variation for each sensor
```

### Add Real Sensors:
Replace `generateSensorData()` function with actual sensor readings:
```cpp
float readTemperature() {
    // Read from DHT22, DS18B20, etc.
    return dht.readTemperature();
}

float readWaterLevel() {
    // Read from ultrasonic sensor, float sensor, etc.
    return analogRead(A0) * (100.0 / 1023.0);
}
```

## 🎉 **Success Indicators**

✅ **ESP8266 connects to WiFi**  
✅ **ESP8266 connects to MQTT broker**  
✅ **Data publishes every 2 minutes**  
✅ **TankManage dashboard shows live data**  
✅ **Fields display current values (not N/A)**  
✅ **Widgets show real-time charts**  

## 🔄 **Next Steps**

Once WiFi + MQTT is working:
1. **Add real sensors** (temperature, water level, pH, pressure)
2. **Implement deep sleep** for battery optimization
3. **Add OTA updates** for remote firmware updates
4. **Deploy multiple ESP8266 nodes** for different tanks
5. **Add error handling** and retry logic

Your ESP8266 will now work completely wirelessly! 🎉 