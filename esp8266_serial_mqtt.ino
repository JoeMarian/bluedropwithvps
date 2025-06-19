#include <ESP8266WiFi.h>

// Serial communication settings
const long interval = 120000; // 2 minutes in milliseconds
unsigned long lastMsg = 0;

// TankManage Testing Dashboard settings
const char* dashboard_id = "685243c10325c40da1d4b468";
const char* field_names[] = {"Temp", "Level", "ph", "Pressure"};
const int num_fields = 4;

// Base values for realistic sensor data
float base_values[] = {25.0, 65.0, 7.2, 1013.25}; // Temp, Level, ph, Pressure
float variations[] = {2.0, 10.0, 0.3, 50.0}; // Max variation for each sensor

void setup() {
  Serial.begin(115200);
  
  Serial.println("ESP8266 TankManage Serial Data Node");
  Serial.print("Dashboard ID: ");
  Serial.println(dashboard_id);
  Serial.println("Fields: Temp, Level, ph, Pressure");
  Serial.println("Sending data every 2 minutes via serial...");
  Serial.println("Format: tankmanage/DASHBOARD_ID/FIELD_NAME:VALUE");
  Serial.println("-" * 50);
}

// Generate realistic sensor data for each field
float generateSensorData(int fieldIndex) {
  float baseValue = base_values[fieldIndex];
  float maxVariation = variations[fieldIndex];
  
  // Add random variation around base value
  float variation = random(-maxVariation * 100, maxVariation * 100) / 100.0;
  float sensorValue = baseValue + variation;
  
  // Apply field-specific constraints
  switch (fieldIndex) {
    case 0: // Temp (15-35°C)
      sensorValue = constrain(sensorValue, 15.0, 35.0);
      break;
    case 1: // Level (0-100%)
      sensorValue = constrain(sensorValue, 0.0, 100.0);
      break;
    case 2: // ph (6.5-8.5)
      sensorValue = constrain(sensorValue, 6.5, 8.5);
      break;
    case 3: // Pressure (950-1050 hPa)
      sensorValue = constrain(sensorValue, 950.0, 1050.0);
      break;
  }
  
  return sensorValue;
}

void loop() {
  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    
    Serial.println("--- Publishing sensor data ---");
    
    // Generate and send data for each field via serial
    for (int i = 0; i < num_fields; i++) {
      float sensorValue = generateSensorData(i);
      
      // Send in format: tankmanage/DASHBOARD_ID/FIELD_NAME:VALUE
      Serial.print("tankmanage/");
      Serial.print(dashboard_id);
      Serial.print("/");
      Serial.print(field_names[i]);
      Serial.print(":");
      Serial.println(sensorValue, 2);
      
      delay(100); // Small delay between sends
    }
    
    Serial.println("--- Data publishing complete ---");
    Serial.println();
  }
} 