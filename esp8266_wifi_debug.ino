#include <ESP8266WiFi.h>

const char* ssid = "Joe Marian iPhone";
const char* password = "dontwanttosaythis";

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("ESP8266 WiFi Debug Test");
  Serial.println("=======================");
  
  // Set WiFi mode
  WiFi.mode(WIFI_STA);
  
  Serial.print("Connecting to: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("WiFi connection failed!");
    Serial.print("Status code: ");
    Serial.println(WiFi.status());
    
    // Print available networks
    Serial.println("Available networks:");
    int n = WiFi.scanNetworks();
    for (int i = 0; i < n; ++i) {
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.print(WiFi.SSID(i));
      Serial.print(" (");
      Serial.print(WiFi.RSSI(i));
      Serial.print(")");
      Serial.println((WiFi.encryptionType(i) == ENC_TYPE_NONE)?" ":"*");
      delay(10);
    }
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi still connected - IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("WiFi disconnected!");
  }
  delay(5000);
} 