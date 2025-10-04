// Door status monitoring utility
export interface DoorStatus {
  door: number;
  status: 'open' | 'closed' | 'unknown';
  timestamp: number;
  orderId?: string;
}

export class DoorStatusMonitor {
  private mqttClient: any = null;
  private doorStatuses: Map<number, DoorStatus> = new Map();
  private listeners: Set<(door: number, status: DoorStatus) => void> = new Set();

  constructor() {
    // Initialize MQTT client if in browser
    if (typeof window !== 'undefined') {
      this.initializeMQTT();
    }
  }

  private async initializeMQTT() {
    try {
      // Dynamic import for MQTT client (browser only)
      const mqtt = await import('mqtt');
      
      // Connect to HiveMQ
      const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
      const MQTT_PORT = 8883;
      const MQTT_USER = 'mqttuser';
      const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';
      
      this.mqttClient = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
        username: MQTT_USER,
        password: MQTT_PASS,
        clientId: 'door-status-monitor-' + Math.random().toString(36).substr(2, 9)
      });

      this.mqttClient.on('connect', () => {
        console.log('Door status monitor connected to MQTT');
        // Subscribe to door events
        this.mqttClient.subscribe('vending/esp-test-1/events');
      });

      this.mqttClient.on('message', (topic: string, message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'door_open' || data.type === 'door_closed') {
            const door = data.door;
            const status: DoorStatus = {
              door,
              status: data.type === 'door_open' ? 'open' : 'closed',
              timestamp: data.timestamp || Date.now(),
              orderId: data.orderId
            };
            
            this.doorStatuses.set(door, status);
            
            // Notify listeners
            this.listeners.forEach(listener => {
              listener(door, status);
            });
          }
        } catch (error) {
          console.error('Error parsing door status message:', error);
        }
      });

      this.mqttClient.on('error', (error: any) => {
        console.error('Door status monitor MQTT error:', error);
      });

    } catch (error) {
      console.error('Failed to initialize door status monitor:', error);
    }
  }

  public subscribe(listener: (door: number, status: DoorStatus) => void) {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getDoorStatus(door: number): DoorStatus | undefined {
    return this.doorStatuses.get(door);
  }

  public getAllDoorStatuses(): Map<number, DoorStatus> {
    return new Map(this.doorStatuses);
  }

  public disconnect() {
    if (this.mqttClient) {
      this.mqttClient.end();
      this.mqttClient = null;
    }
  }
}

// Global instance
export const doorStatusMonitor = new DoorStatusMonitor();
