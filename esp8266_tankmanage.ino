#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings
const char* mqtt_server = "localhost";  // Change to your MQTT broker IP
const int mqtt_port = 1883;
const char* mqtt_username = "";  // Leave empty if no authentication
const char* mqtt_password = "";  // Leave empty if no authentication

// TankManage settings
const char* dashboard_id = "YOUR_DASHBOARD_ID";  // Replace with your actual dashboard ID
const char* field_name = "water_level";  // Replace with your field name

// MQTT topics
char mqtt_topic[100];

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
const long interval = 120000; // 2 minutes in milliseconds

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  // Create MQTT topic
  sprintf(mqtt_topic, "tankmanage/%s/%s", dashboard_id, field_name);
  
  Serial.println("ESP8266 TankManage Sensor Node");
  Serial.print("Dashboard ID: ");
  Serial.println(dashboard_id);
  Serial.print("Field Name: ");
  Serial.println(field_name);
  Serial.print("MQTT Topic: ");
  Serial.println(mqtt_topic);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
    }
  }
}

// Generate random sensor data
float generateSensorData() {
  // Simulate water level between 0-100%
  float waterLevel = random(0, 101); // 0 to 100
  
  // Add some realistic variation
  waterLevel += random(-5, 6) / 10.0; // Add/subtract up to 0.5
  
  // Ensure value is within bounds
  if (waterLevel < 0) waterLevel = 0;
  if (waterLevel > 100) waterLevel = 100;
  
  return waterLevel;
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    
    // Generate sensor data
    float sensorValue = generateSensorData();
    
    // Create JSON payload
    StaticJsonDocument<200> doc;
    doc["value"] = sensorValue;
    doc["timestamp"] = millis();
    doc["device_id"] = "ESP8266_TankManage";
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Publish to MQTT
    Serial.print("Publishing: ");
    Serial.println(jsonString);
    
    if (client.publish(mqtt_topic, jsonString.c_str())) {
      Serial.println("Message published successfully");
    } else {
      Serial.println("Failed to publish message");
    }
    
    // Also publish just the value (for backward compatibility)
    String valueString = String(sensorValue, 2);
    if (client.publish(mqtt_topic, valueString.c_str())) {
      Serial.print("Value published: ");
      Serial.println(valueString);
    }
  }
} 