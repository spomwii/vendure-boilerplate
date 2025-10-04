// Direct MQTT unlock utility - bypasses vending service to prevent ESP32 conflicts
export interface UnlockResult {
  success: boolean;
  message: string;
  error?: string;
}

export class DirectMQTTUnlock {
  private mqttClient: any = null;
  private isConnected = false;

  constructor() {
    // Only initialize in browser
    if (typeof window !== 'undefined') {
      this.initializeMQTT();
    }
  }

  private async initializeMQTT() {
    try {
      console.log('Initializing direct MQTT unlock...');
      
      // Dynamic import for MQTT client (browser only)
      const mqtt = await import('mqtt');
      console.log('MQTT library loaded successfully');
      
      // Connect to HiveMQ with unique client ID
      const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
      const MQTT_PORT = 8883;
      const MQTT_USER = 'mqttuser';
      const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';
      
      const clientId = 'storefront-unlock-' + Math.random().toString(36).substr(2, 9);
      console.log('Connecting to MQTT with client ID:', clientId);
      
      this.mqttClient = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
        username: MQTT_USER,
        password: MQTT_PASS,
        clientId: clientId,
        clean: true, // Clean session to avoid conflicts
        reconnectPeriod: 0, // Don't auto-reconnect to avoid conflicts
        connectTimeout: 10000, // 10 second timeout
        keepalive: 60
      });

      this.mqttClient.on('connect', () => {
        console.log('✅ Direct MQTT unlock connected successfully');
        this.isConnected = true;
      });

      this.mqttClient.on('error', (error: any) => {
        console.error('❌ Direct MQTT unlock error:', error);
        this.isConnected = false;
      });

      this.mqttClient.on('offline', () => {
        console.log('📴 Direct MQTT unlock offline');
        this.isConnected = false;
      });

      this.mqttClient.on('close', () => {
        console.log('🔌 Direct MQTT unlock connection closed');
        this.isConnected = false;
      });

      // Wait for connection with timeout
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!this.isConnected) {
            console.error('❌ MQTT connection timeout');
            reject(new Error('MQTT connection timeout'));
          }
        }, 15000); // 15 second timeout

        this.mqttClient.on('connect', () => {
          clearTimeout(timeout);
          resolve(true);
        });

        this.mqttClient.on('error', (error: any) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Failed to initialize direct MQTT unlock:', error);
      throw error;
    }
  }

  public async unlockDoor(door: number, orderId: string): Promise<UnlockResult> {
    if (!this.mqttClient || !this.isConnected) {
      return {
        success: false,
        message: 'MQTT not connected',
        error: 'MQTT client not available'
      };
    }

    try {
      // Create unlock message (same format as ESP32 expects)
      const unlockMessage = {
        type: 'unlock',
        port: door - 1, // Convert door number to port index (door 1 = port 0)
        orderId: orderId,
        token: 'DIRECT-UNLOCK-' + Date.now(), // Simple token for direct unlock
        durationMs: 600 // 600ms unlock duration
      };

      const topic = 'vending/esp-test-1/cmd';
      const payload = JSON.stringify(unlockMessage);

      console.log('Publishing direct unlock:', topic, payload);

      return new Promise((resolve) => {
        this.mqttClient.publish(topic, payload, { qos: 1 }, (err: any) => {
          if (err) {
            console.error('Direct unlock publish error:', err);
            resolve({
              success: false,
              message: 'Failed to publish unlock command',
              error: err.message
            });
          } else {
            console.log('Direct unlock published successfully');
            resolve({
              success: true,
              message: `Door #${door} unlock command sent successfully`
            });
          }
        });
      });

    } catch (error: any) {
      console.error('Direct unlock error:', error);
      return {
        success: false,
        message: 'Unlock command failed',
        error: error.message
      };
    }
  }

  public disconnect() {
    if (this.mqttClient) {
      this.mqttClient.end();
      this.mqttClient = null;
      this.isConnected = false;
    }
  }
}

// Global instance
export const directMQTTUnlock = new DirectMQTTUnlock();
