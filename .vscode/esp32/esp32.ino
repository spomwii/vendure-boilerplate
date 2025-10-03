// vending-esp32-full.ino
// Full ESP32 sketch for vending POC
// Libraries required: PubSubClient, ArduinoJson
// Install via Arduino Library Manager

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ----- CONFIG (REPLACE THESE) -----
const char* WIFI_SSID = "ssid";
const char* WIFI_PASS = "pass";

// MQTT broker (use the same broker host that your server uses)
const char* MQTT_HOST = "b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud";
const uint16_t MQTT_PORT = 8883;
const char* MQTT_USER = "username";
const char* MQTT_PASS = "pass";

const char* DEVICE_ID = "esp-test-1"; // e.g. esp-test-1

// If you want to validate broker TLS certs, paste CA PEM here and comment out setInsecure below
// const char* root_ca = "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n";

// ----- PIN LAYOUT (your mapping) -----
#define OUTPUTS 8
#define INPUTS  8
int input_pins[INPUTS]   = {32, 26, 14, 13, 15, 5, 19, 22};
int output_pins[OUTPUTS] = {25, 27, 12, 2,  4, 18, 21, 23};

// Timing / debounce
const unsigned long DEBOUNCE_MS = 50;
const unsigned long DOOR_PUBLISH_MIN_MS = 500;   // min time between sensor publishes
const unsigned long UNLOCK_DURATION_MS = 500;   // default unlock pulse
const unsigned long HEARTBEAT_MS = 300000;        // 30s heartbeat
const unsigned long TOKEN_WINDOW_MS = 300000;    // 300s = 5 minutes (match server TTL)

// ----- Globals -----
WiFiClientSecure net;
PubSubClient client(net);

const unsigned long BOOT_IGNORE_MS = 5000; // ignore messages for first 5 seconds after boot
unsigned long bootAtMs = 0;

String cmdTopic;
String eventsTopic;

bool sensorState[INPUTS];
unsigned long lastChangeMs[INPUTS];
unsigned long lastPublishMs[INPUTS];

String lastIssuedToken[INPUTS];       // per-door last token
unsigned long lastTokenExpiry[INPUTS];
bool tokenUsed[INPUTS];

unsigned long lastHeartbeat = 0;

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
  char buf[512];
  size_t n = serializeJson(doc, buf);
  client.publish(eventsTopic.c_str(), buf, n);
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
  // Ignore messages arriving right after boot to avoid triggering retained/queued commands
  if (millis() - bootAtMs < BOOT_IGNORE_MS) {
    Serial.print("Ignoring MQTT message during boot window, topic: ");
    Serial.println(topic);
    return;
  }

  // copy payload into null-terminated string
  char buf[1024];
  unsigned int copyLen = (length < sizeof(buf)-1) ? length : sizeof(buf)-1;
  memcpy(buf, payload, copyLen);
  buf[copyLen] = '\0';

  Serial.print("MQTT RX topic: ");
  Serial.println(topic);
  Serial.print("MQTT raw payload: ");
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

    // store token for the corresponding door index (port -> index)
    int idx = port;
    if (idx >= 0 && idx < INPUTS) {
      lastIssuedToken[idx] = String(token);
      lastTokenExpiry[idx] = millis() + TOKEN_WINDOW_MS;
      tokenUsed[idx] = false;
      Serial.printf("Stored token for door idx %d (expires in %lums)\n", idx, TOKEN_WINDOW_MS);
    }

    // actuate
    actuatePort(port, duration);

    // Optionally publish immediate door_open (we rely on sensor to publish on actual open)
    // publishSimpleEvent("door_open", port+1, orderId, token);
  } else {
    Serial.println("Unknown command type");
  }
}

// ----- MQTT connect loop -----
void connectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting MQTT...");
    if (client.connect(DEVICE_ID, MQTT_USER, MQTT_PASS)) {
      Serial.println("connected");
      cmdTopic = "vending/" + String(DEVICE_ID) + "/cmd";
      eventsTopic = "vending/" + String(DEVICE_ID) + "/events";
      client.subscribe(cmdTopic.c_str(), 1);
      Serial.print("Subscribed to ");
      Serial.println(cmdTopic);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retry in 2s");
      delay(2000);
    }
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
    lastChangeMs[i] = millis();   // prevent immediate publish on boot
    lastPublishMs[i] = millis();
    lastIssuedToken[i] = "";
    lastTokenExpiry[i] = 0;
    tokenUsed[i] = false;
  }
}

void setup() {
  Serial.begin(115200);
  bootAtMs = millis();
  delay(200);
  setupPins();
  connectWiFi();
  // For POC only: disable strict TLS; in production, replace with setCACert(root_ca)
  net.setInsecure();
  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(mqttCallback);
  connectMQTT();
}

void loop() {
  if (!client.connected()) connectMQTT();
  client.loop();

  unsigned long now = millis();
  for (int i = 0; i < INPUTS; ++i) {
    // Read sensor. Adjust logic if your sensor polarity is opposite.
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
            tokenUsed[i] = true; // mark local used
          }
          ev["timestamp"] = now;
          char buf[512];
          size_t n = serializeJson(ev, buf);
          client.publish(eventsTopic.c_str(), buf, n);
          lastPublishMs[i] = now;
          Serial.printf("Sensor change door %d -> %s\n", i+1, sensorState[i] ? "door_open" : "door_closed");
        }
      }
    } else {
      // update lastChangeMs to avoid sticky debounce issues
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
    char hbBuf[128];
    size_t hn = serializeJson(hb, hbBuf);
    client.publish(eventsTopic.c_str(), hbBuf, hn);
  }
}