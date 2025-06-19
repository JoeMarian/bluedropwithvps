# ESP8266 USB Connection Setup

## 🔌 **USB Connection Method (No WiFi Required)**

Since you're connecting ESP8266 directly to your laptop via USB cable, we'll use a **Serial-to-MQTT Bridge** approach:

1. **ESP8266** → Sends data via Serial (USB)
2. **Python Bridge** → Reads Serial data and publishes to MQTT
3. **TankManage** → Receives MQTT data and updates dashboard

## 📁 **Files Created:**

1. **`esp8266_serial_mqtt.ino`** - ESP8266 code that sends data via Serial
2. **`serial_mqtt_bridge.py`** - Python bridge that reads Serial and publishes to MQTT

## 🚀 **Setup Steps:**

### **Step 1: Upload ESP8266 Code**
1. Open `esp8266_serial_mqtt.ino` in Arduino IDE
2. Select board: **NodeMCU 1.0 (ESP-12E Module)**
3. Select the correct port (where ESP8266 is connected)
4. Upload the code

### **Step 2: Verify ESP8266 Output**
Open Serial Monitor (115200 baud) to see:
```
ESP8266 TankManage Serial Data Node
Dashboard ID: 685243c10325c40da1d4b468
Fields: Temp, Level, ph, Pressure
Sending data every 2 minutes via serial...
Format: tankmanage/DASHBOARD_ID/FIELD_NAME:VALUE
--------------------------------------------------
--- Publishing sensor data ---
tankmanage/685243c10325c40da1d4b468/Temp:26.45
tankmanage/685243c10325c40da1d4b468/Level:72.30
tankmanage/685243c10325c40da1d4b468/ph:7.35
tankmanage/685243c10325c40da1d4b468/Pressure:1018.75
--- Data publishing complete ---
```

### **Step 3: Run the Serial-to-MQTT Bridge**
```bash
python serial_mqtt_bridge.py
```

Expected output:
```
Found ESP8266 on port: /dev/tty.usbserial-1410
Connected to ESP8266 on /dev/tty.usbserial-1410
Connected to MQTT broker successfully
Serial to MQTT Bridge Started
Reading data from ESP8266 and publishing to MQTT...
Press Ctrl+C to stop
--------------------------------------------------
Received: ESP8266 TankManage Serial Data Node
  Info: ESP8266 TankManage Serial Data Node
Received: Dashboard ID: 685243c10325c40da1d4b468
  Info: Dashboard ID: 685243c10325c40da1d4b468
Received: tankmanage/685243c10325c40da1d4b468/Temp:26.45
  Published: Temp = 26.45 -> tankmanage/685243c10325c40da1d4b468/Temp
Message published with ID: 1
```

### **Step 4: Check TankManage Dashboard**
- Open: https://tankmanage.teamskrn.xyz/dashboard/685243c10325c40da1d4b468
- You should see data updating every 2 minutes

## 🔧 **Configuration Options:**

### **Change Data Interval**
In `esp8266_serial_mqtt.ino`:
```cpp
const long interval = 120000; // 2 minutes (change to 60000 for 1 minute)
```

### **Modify Sensor Ranges**
```cpp
// Base values for realistic sensor data
float base_values[] = {25.0, 65.0, 7.2, 1013.25}; // Temp, Level, ph, Pressure
float variations[] = {2.0, 10.0, 0.3, 50.0}; // Max variation for each sensor
```

## 🔍 **Troubleshooting:**

### **ESP8266 Port Not Found:**
```bash
# List available ports
ls /dev/tty.*

# Common ESP8266 ports:
# macOS: /dev/tty.usbserial-*, /dev/tty.wchusbserial*
# Linux: /dev/ttyUSB*
# Windows: COM*
```

### **Serial Monitor Shows Garbage:**
- Check baud rate is set to 115200
- Ensure ESP8266 is properly connected
- Try resetting ESP8266

### **Bridge Can't Connect to MQTT:**
- Ensure Mosquitto is running: `brew services list | grep mosquitto`
- Check MQTT broker settings in the bridge script

### **No Data in Dashboard:**
- Check dashboard ID is correct
- Verify field names match exactly
- Monitor MQTT messages: `mosquitto_sub -h localhost -t "tankmanage/#" -v`

## 📊 **Data Flow:**

```
ESP8266 (USB) → Serial Data → Python Bridge → MQTT → TankManage Dashboard
```

## 🎯 **Advantages of USB Connection:**

✅ **No WiFi setup required**  
✅ **More reliable connection**  
✅ **Easier debugging**  
✅ **No network issues**  
✅ **Real-time data flow**  

## 🚀 **Quick Start:**

1. **Upload ESP8266 code** (`esp8266_serial_mqtt.ino`)
2. **Run bridge script** (`python serial_mqtt_bridge.py`)
3. **Check dashboard** for live data updates

That's it! Your ESP8266 will send data every 2 minutes via USB, and it will appear in your TankManage dashboard. 