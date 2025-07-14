#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <math.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// BlueDrop API config
const char* api_url = "https://api.teamskrn.xyz/api/v1/data/ingest"; // Use https for production
const char* dashboard_api_key = "TXh5Tco2slVN";
const char* dashboard_id = "68661a810c30cfdacd9c0589";
const char* field_name_actual = "Level";
const char* field_name_trend = "Trend";

// ADC and sampling config
const float VREF = 3;
const int MAX_LEVEL_MM = 5000;
const unsigned long SAMPLE_INTERVAL_MS = 60000;
const int FIT_SIZE = 14;
const int OUTLIER_THRESHOLD = 5;
const float RESIDUAL_THRESHOLD = 1.2;

// Buffers
float values[FIT_SIZE];
float residuals[FIT_SIZE];
int value_index = 0;
int residual_index = 0;
int outlier_count = 0;

unsigned long last_sample_time = 0;

// WiFi
WiFiClient wifiClient;

// --------------------- WiFi Setup ---------------------

void setup_wifi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Connected!");
}

// --------------------- Sensor + OLS Logic ---------------------

float read_level_mm() {
  int raw = analogRead(A0);  // 10-bit: 0–1023
  float voltage = (float)raw * VREF / 1023.0;
  return voltage * (MAX_LEVEL_MM / VREF);
}

void compute_ols(const float* x_vals, const float* y_vals, int n, float& slope, float& intercept) {
  float sum_x = 0, sum_y = 0, sum_xy = 0, sum_x2 = 0;
  for (int i = 0; i < n; i++) {
    sum_x += x_vals[i];
    sum_y += y_vals[i];
    sum_xy += x_vals[i] * y_vals[i];
    sum_x2 += x_vals[i] * x_vals[i];
  }

  float denom = n * sum_x2 - sum_x * sum_x;
  if (denom != 0) {
    slope = (n * sum_xy - sum_x * sum_y) / denom;
    intercept = (sum_y - slope * sum_x) / n;
  } else {
    slope = 0;
    intercept = 0;
  }
}

// --------------------- HTTP Publishing ---------------------

void send_data_http(const char* field, float value) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return;
  }

  HTTPClient http;
  http.begin(wifiClient, api_url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-KEY", dashboard_api_key); // If your backend expects API key in header

  // Prepare JSON payload
  StaticJsonDocument<256> doc;
  doc["dashboard_id"] = dashboard_id;
  doc["field_name"] = field;
  doc["value"] = value;

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("HTTP POST [%d]: %s\n", httpCode, response.c_str());
  } else {
    Serial.printf("HTTP POST failed: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// --------------------- Main Setup + Loop ---------------------

void setup() {
  Serial.begin(115200);
  delay(1000);
  setup_wifi();

  // Fill initial buffer
  for (int i = 0; i < FIT_SIZE; i++) {
    values[i] = read_level_mm();
    delay(SAMPLE_INTERVAL_MS);
  }
  last_sample_time = millis();
}

void loop() {
  if (millis() - last_sample_time >= SAMPLE_INTERVAL_MS) {
    last_sample_time = millis();

    float X[FIT_SIZE];
    for (int i = 0; i < FIT_SIZE; i++) X[i] = i;

    float slope, intercept;
    compute_ols(X, values, FIT_SIZE, slope, intercept);

    float level = read_level_mm();
    send_data_http(field_name_actual, level);

    float predicted = slope * (FIT_SIZE - 1) + intercept;
    float residual = level - predicted;

    // Update residual buffer
    residuals[residual_index % FIT_SIZE] = residual;
    residual_index++;

    int count = min(residual_index, FIT_SIZE);
    float mean = 0, std = 0;
    for (int i = 0; i < count; i++) mean += residuals[i];
    mean /= count;
    for (int i = 0; i < count; i++) std += pow(residuals[i] - mean, 2);
    std = sqrt(std / count);
    float std_res = (std > 0) ? (residual - mean) / std : 0;

    float trend_value = NAN;
    if (abs(std_res) > RESIDUAL_THRESHOLD) {
      outlier_count++;
      if (outlier_count >= OUTLIER_THRESHOLD) {
        trend_value = level;
        send_data_http(field_name_trend, level);
        outlier_count = 0;
      }
    } else {
      outlier_count = 0;
    }

    values[value_index % FIT_SIZE] = level;
    value_index++;
  }
} 