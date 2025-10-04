// vending-esp32-improved.ino
// Improved ESP32 sketch with better MQTT handling
// Libraries required: PubSubClient, ArduinoJson
// Install via Arduino Library Manager

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ----- CONFIG (REPLACE THESE) -----
const char* WIFI_SSID = "Aurora";
const char* WIFI_PASS = "659dryrt";

// MQTT broker
const char* MQTT_HOST = "b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud";
const uint16_t MQTT_PORT = 8883;
const char* MQTT_USER = "mqttuser";
const char* MQTT_PASS = "4P1VQ7Z2jRItKCLgyI0MagNo";

const char* DEVICE_ID = "esp-test-1";

// ----- PIN LAYOUT -----
#define OUTPUTS 8
#define INPUTS  8
int input_pins[INPUTS]   = {32, 26, 14, 13, 15, 5, 19, 22};
int output_pins[OUTPUTS] = {25, 27, 12, 2,  4, 18, 21, 23};

// Timing
const unsigned long DEBOUNCE_MS = 50;
const unsigned long DOOR_PUBLISH_MIN_MS = 500;
const unsigned long UNLOCK_DURATION_MS = 600;
const unsigned long HEARTBEAT_MS = 30000;        // 30s heartbeat
const unsigned long TOKEN_WINDOW_MS = 300000;     // 5 minutes
const unsigned long RECONNECT_DELAY_MS = 5000;  // 5s reconnect delay

// ----- Globals -----
WiFiClientSecure net;
PubSubClient client(net);

String cmdTopic;
String eventsTopic;

bool sensorState[INPUTS];
unsigned long lastChangeMs[INPUTS];
unsigned long lastPublishMs[INPUTS];

String lastIssuedToken[INPUTS];
unsigned long lastTokenExpiry[INPUTS];
bool tokenUsed[INPUTS];

unsigned long lastHeartbeat = 0;
unsigned long lastReconnectAttempt = 0;
bool mqttConnected = false;

// ----- Helper functions -----
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 60) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi failed");
  }
}

void publishEventJson(const JsonDocument& doc) {
  if (!mqttConnected) return;
  
  char buf[512];
  size_t n = serializeJson(doc, buf);
  if (client.publish(eventsTopic.c_str(), buf, n)) {
    Serial.println("Event published successfully");
  } else {
    Serial.println("Failed to publish event");
  }
}

void publishSimpleEvent(const char* type, int doorIndex, const char* orderId = nullptr, const char* token = nullptr) {
  StaticJsonDocument<256> ev;
  ev["type"] = type;
  ev["door"] = doorIndex;
  if (orderId) ev["orderId"] = orderId;
  if (token) ev["token"] = token;
  ev["timestamp"] = millis();
  publishEventJson(ev);
  Serial.print("Published ");
  Serial.print(type);
  Serial.print(" for door ");
  Serial.println(doorIndex);
}

void actuatePort(int portIndex, unsigned long durationMs = UNLOCK_DURATION_MS) {
  if (portIndex < 0 || portIndex >= OUTPUTS) return;
  int pin = output_pins[portIndex];
  Serial.printf("Activating port %d -> pin %d for %lums\n", portIndex, pin, durationMs);
  digitalWrite(pin, HIGH);
  delay(durationMs);
  digitalWrite(pin, LOW);
}

// ----- MQTT callback -----
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("MQTT RX topic: ");
  Serial.println(topic);
  Serial.print("MQTT raw payload: ");
  
  // copy payload into null-terminated string
  char buf[1024];
  unsigned int copyLen = (length < sizeof(buf)-1) ? length : sizeof(buf)-1;
  memcpy(buf, payload, copyLen);
  buf[copyLen] = '\0';
  Serial.println(buf);

  StaticJsonDocument<1024> doc;
  DeserializationError err = deserializeJson(doc, buf);
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  const char* type = doc["type"] | "";
  Serial.print("Command type: ");
  Serial.println(type);

  if (strcmp(type, "unlock") == 0) {
    int port = doc["port"] | 0;
    const char* token = doc["token"] | "";
    const char* orderId = doc["orderId"] | "";
    int duration = doc["durationMs"] | UNLOCK_DURATION_MS;

    Serial.printf("Unlock cmd received: port=%d, orderId=%s, tokenLen=%d, duration=%d\n",
                  port, orderId ? orderId : "(null)", (int)strlen(token), duration);

    // store token for the corresponding door index
    int idx = port;
    if (idx >= 0 && idx < INPUTS) {
      lastIssuedToken[idx] = String(token);
      lastTokenExpiry[idx] = millis() + TOKEN_WINDOW_MS;
      tokenUsed[idx] = false;
      Serial.printf("Stored token for door idx %d (expires in %lums)\n", idx, TOKEN_WINDOW_MS);
    }

    // actuate
    actuatePort(port, duration);
    
    // Publish immediate door_open event
    publishSimpleEvent("door_open", port+1, orderId, token);
  } else {
    Serial.println("Unknown command type");
  }
}

// ----- MQTT connection with retry -----
void connectMQTT() {
  if (mqttConnected) return;
  
  unsigned long now = millis();
  if (now - lastReconnectAttempt < RECONNECT_DELAY_MS) {
    return;
  }
  lastReconnectAttempt = now;
  
  Serial.print("Connecting MQTT...");
  
  // Generate unique client ID
  String clientId = String(DEVICE_ID) + "-" + String(random(0xffff), HEX);
  
  if (client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
    Serial.println("connected");
    mqttConnected = true;
    
    cmdTopic = "vending/" + String(DEVICE_ID) + "/cmd";
    eventsTopic = "vending/" + String(DEVICE_ID) + "/events";
    
    if (client.subscribe(cmdTopic.c_str(), 1)) {
      Serial.print("Subscribed to ");
      Serial.println(cmdTopic);
    } else {
      Serial.println("Failed to subscribe to cmd topic");
      mqttConnected = false;
    }
  } else {
    Serial.print("failed, rc=");
    Serial.print(client.state());
    Serial.println(" retry in 5s");
    mqttConnected = false;
  }
}

// ----- Setup and loop -----
void setupPins() {
  for (int i = 0; i < OUTPUTS; ++i) {
    pinMode(output_pins[i], OUTPUT);
    digitalWrite(output_pins[i], LOW);
  }
  for (int i = 0; i < INPUTS; ++i) {
    pinMode(input_pins[i], INPUT_PULLUP);
    sensorState[i] = digitalRead(input_pins[i]) == LOW ? false : true;
    lastChangeMs[i] = millis();
    lastPublishMs[i] = millis();
    lastIssuedToken[i] = "";
    lastTokenExpiry[i] = 0;
    tokenUsed[i] = false;
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  
  setupPins();
  connectWiFi();
  
  // For POC only: disable strict TLS
  net.setInsecure();
  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(mqttCallback);
  
  Serial.println("ESP32 Vending Machine - Improved Version");
  Serial.println("======================================");
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    connectWiFi();
    return;
  }
  
  // Check MQTT connection
  if (!client.connected()) {
    mqttConnected = false;
    connectMQTT();
    return;
  }
  
  // Process MQTT messages
  client.loop();

  unsigned long now = millis();
  
  // Read door sensors
  for (int i = 0; i < INPUTS; ++i) {
    bool raw = digitalRead(input_pins[i]) == LOW ? true : false;

    if (raw != sensorState[i]) {
      if (now - lastChangeMs[i] > DEBOUNCE_MS) {
        sensorState[i] = raw;
        lastChangeMs[i] = now;
        if (now - lastPublishMs[i] > DOOR_PUBLISH_MIN_MS) {
          // build event
          StaticJsonDocument<256> ev;
          ev["type"] = sensorState[i] ? "door_open" : "door_closed";
          ev["door"] = i + 1;
          
          // include token if we have one and it's not used and not expired
          if (sensorState[i] && lastIssuedToken[i].length() > 0 && !tokenUsed[i] && millis() < lastTokenExpiry[i]) {
            ev["token"] = lastIssuedToken[i];
            tokenUsed[i] = true;
          }
          ev["timestamp"] = now;
          
          publishEventJson(ev);
          lastPublishMs[i] = now;
          Serial.printf("Sensor change door %d -> %s\n", i+1, sensorState[i] ? "door_open" : "door_closed");
        }
      }
    } else {
      lastChangeMs[i] = now;
    }
  }

  // heartbeat
  if (now - lastHeartbeat > HEARTBEAT_MS) {
    lastHeartbeat = now;
    StaticJsonDocument<128> hb;
    hb["type"] = "heartbeat";
    hb["deviceId"] = DEVICE_ID;
    hb["ts"] = now;
    hb["mqttConnected"] = mqttConnected;
    hb["wifiConnected"] = WiFi.status() == WL_CONNECTED;
    publishEventJson(hb);
    Serial.println("Heartbeat sent");
  }
}
