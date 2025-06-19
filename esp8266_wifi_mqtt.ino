#include <ESP8266WiFi.h>
#include <PubSubClient.h>

// WiFi credentials - UPDATE THESE WITH YOUR NETWORK DETAILS
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings - UPDATE WITH YOUR COMPUTER'S IP ADDRESS
const char* mqtt_server = "YOUR_COMPUTER_IP";  // Your computer's IP address
const int mqtt_port = 1883;

// TankManage Testing Dashboard settings
const char* dashboard_id = "685243c10325c40da1d4b468";  // Your testing dashboard ID
const char* field_names[] = {"Temp", "Level", "ph", "Pressure"};
const int num_fields = 4;

// MQTT topics
char mqtt_topics[4][100];

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsg = 0;
const long interval = 120000; // 2 minutes in milliseconds

// Base values for realistic sensor data
float base_values[] = {25.0, 65.0, 7.2, 1013.25}; // Temp, Level, ph, Pressure
float variations[] = {2.0, 10.0, 0.3, 50.0}; // Max variation for each sensor

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  // Create MQTT topics for each field
  for (int i = 0; i < num_fields; i++) {
    sprintf(mqtt_topics[i], "tankmanage/%s/%s", dashboard_id, field_names[i]);
  }
  
  Serial.println("ESP8266 TankManage WiFi + MQTT Node");
  Serial.print("Dashboard ID: ");
  Serial.println(dashboard_id);
  Serial.println("Fields:");
  for (int i = 0; i < num_fields; i++) {
    Serial.print("  ");
    Serial.print(field_names[i]);
    Serial.print(": ");
    Serial.println(mqtt_topics[i]);
  }
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
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
    }
  }
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
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    
    Serial.println("--- Publishing sensor data ---");
    
    // Generate and publish data for each field
    for (int i = 0; i < num_fields; i++) {
      float sensorValue = generateSensorData(i);
      String valueString = String(sensorValue, 2);
      
      Serial.print(field_names[i]);
      Serial.print(": ");
      Serial.print(valueString);
      Serial.print(" -> ");
      Serial.println(mqtt_topics[i]);
      
      if (client.publish(mqtt_topics[i], valueString.c_str())) {
        Serial.println("  Published successfully");
      } else {
        Serial.println("  Failed to publish");
      }
      
      delay(100); // Small delay between publishes
    }
    
    Serial.println("--- Data publishing complete ---");
    Serial.println();
  }
} 