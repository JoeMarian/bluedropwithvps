# ESP8266 Setup for Testing Dashboard

## ✅ **Current Status**
- ✅ MQTT service is working correctly
- ✅ Mosquitto broker is running
- ✅ Backend is running and processing MQTT data
- ✅ Test data is being sent successfully

## 📊 **Your Testing Dashboard**
- **Dashboard ID**: `685243c10325c40da1d4b468`
- **Dashboard Name**: Testing
- **Fields**: Temp, Level, ph, Pressure
- **API Key**: `DCFp0B827qsl`

## 🔧 **ESP8266 Configuration**

### 1. **Use the ESP8266 Code**
Open `esp8266_testing_dashboard.ino` in Arduino IDE

### 2. **Update Configuration**
```cpp
// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings
const char* mqtt_server = "YOUR_COMPUTER_IP";  // Your computer's IP address
const int mqtt_port = 1883;

// TankManage Testing Dashboard settings
const char* dashboard_id = "685243c10325c40da1d4b468";  // Already configured
const char* field_names[] = {"Temp", "Level", "ph", "Pressure"};  // Already configured
```

### 3. **Find Your Computer's IP Address**
```bash
# On macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Look for something like: 192.168.1.100
```

### 4. **Realistic Sensor Data Ranges**
The ESP8266 will generate realistic data:
- **Temp**: 15-35°C (base: 25°C ± 2°C)
- **Level**: 0-100% (base: 65% ± 10%)
- **ph**: 6.5-8.5 (base: 7.2 ± 0.3)
- **Pressure**: 950-1050 hPa (base: 1013.25 ± 50 hPa)

## 🚀 **Upload and Test**

### 1. **Upload to ESP8266**
- Connect ESP8266 to computer
- Select board: NodeMCU 1.0 (ESP-12E Module)
- Upload the code

### 2. **Monitor Serial Output**
Open Serial Monitor (115200 baud) to see:
```
ESP8266 TankManage Testing Dashboard Node
Dashboard ID: 685243c10325c40da1d4b468
Fields:
  Temp: tankmanage/685243c10325c40da1d4b468/Temp
  Level: tankmanage/685243c10325c40da1d4b468/Level
  ph: tankmanage/685243c10325c40da1d4b468/ph
  Pressure: tankmanage/685243c10325c40da1d4b468/Pressure
Connecting to WiFi...
WiFi connected
IP address: 192.168.1.101
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

### 3. **Check TankManage Dashboard**
- Open: https://tankmanage.teamskrn.xyz/dashboard/685243c10325c40da1d4b468
- You should see data updating every 2 minutes
- Widgets will show real-time charts and values

## 🔍 **Troubleshooting**

### If ESP8266 won't connect to WiFi:
- Check SSID and password
- Ensure WiFi is 2.4GHz (not 5GHz)

### If MQTT connection fails:
- Check your computer's IP address
- Ensure ESP8266 and computer are on same network
- Verify Mosquitto is running: `brew services list | grep mosquitto`

### If no data appears in dashboard:
- Check dashboard ID is correct
- Verify field names match exactly (case-sensitive)
- Check backend logs for MQTT messages

### To monitor MQTT messages:
```bash
mosquitto_sub -h localhost -t "tankmanage/#" -v
```

## 📱 **Alternative: Python Test Script**
If you want to test without ESP8266 hardware:
```bash
python test_mqtt.py
```
This will simulate ESP8266 data every 2 minutes.

## 🎯 **Expected Results**
After setup, your dashboard should show:
- **Temp widget**: Line chart with temperature data (15-35°C)
- **Level widget**: Bar chart with water level (0-100%)
- **ph widget**: Numeric display with pH values (6.5-8.5)
- **Pressure widget**: Chart with atmospheric pressure (950-1050 hPa)

Data will update every 2 minutes with realistic variations! 