void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("ESP8266 Test - Starting up...");
  Serial.println("If you can see this, the connection is working!");
}

void loop() {
  Serial.println("ESP8266 is working correctly!");
  delay(2000);
} 