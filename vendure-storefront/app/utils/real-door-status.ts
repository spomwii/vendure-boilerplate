// Real door status monitoring via MQTT
// This runs on the server side to avoid ESP32 conflicts

export interface DoorStatus {
  door: number;
  status: 'open' | 'closed' | 'unknown';
  timestamp: number;
  orderId?: string;
}

export class RealDoorStatusMonitor {
  private mqttClient: any = null;
  private doorStatuses: Map<number, DoorStatus> = new Map();
  private listeners: Set<(door: number, status: DoorStatus) => void> = new Set();
  private isConnected = false;

  constructor() {
    // Initialize MQTT connection
    this.initializeMQTT();
  }

  private async initializeMQTT() {
    try {
      console.log('Initializing real door status monitor...');
      
      // Dynamic import for MQTT client (server-side only)
      const mqtt = await import('mqtt');
      
      // MQTT configuration
      const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
      const MQTT_PORT = 8883;
      const MQTT_USER = 'mqttuser';
      const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';
      
      const clientId = 'door-status-monitor-' + Math.random().toString(36).substr(2, 9);
      
      console.log('Connecting door status monitor to MQTT:', clientId);
      
      this.mqttClient = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
        username: MQTT_USER,
        password: MQTT_PASS,
        clientId: clientId,
        clean: true,
        reconnectPeriod: 0 // Don't auto-reconnect to avoid conflicts
      });

      this.mqttClient.on('connect', () => {
        console.log('✅ Door status monitor connected to MQTT');
        this.isConnected = true;
        
        // Subscribe to door status topics
        this.mqttClient.subscribe('vending/esp-test-1/status/door_open', { qos: 1 });
        this.mqttClient.subscribe('vending/esp-test-1/status/door_closed', { qos: 1 });
        console.log('📡 Subscribed to door status topics');
      });

      this.mqttClient.on('message', (topic: string, message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('📨 Door status message received:', topic, data);
          
          if (topic.includes('door_open')) {
            this.handleDoorOpen(data);
          } else if (topic.includes('door_closed')) {
            this.handleDoorClosed(data);
          }
        } catch (error) {
          console.error('❌ Error parsing door status message:', error);
        }
      });

      this.mqttClient.on('error', (error: any) => {
        console.error('❌ Door status monitor MQTT error:', error);
        this.isConnected = false;
      });

      this.mqttClient.on('offline', () => {
        console.log('📴 Door status monitor offline');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ Failed to initialize door status monitor:', error);
    }
  }

  private handleDoorOpen(data: any) {
    const door = data.door || data.port + 1; // Convert port to door number
    const status: DoorStatus = {
      door: door,
      status: 'open',
      timestamp: Date.now(),
      orderId: data.orderId
    };
    
    this.doorStatuses.set(door, status);
    console.log(`🚪 Door ${door} opened`);
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      listener(door, status);
    });
  }

  private handleDoorClosed(data: any) {
    const door = data.door || data.port + 1; // Convert port to door number
    const status: DoorStatus = {
      door: door,
      status: 'closed',
      timestamp: Date.now(),
      orderId: data.orderId
    };
    
    this.doorStatuses.set(door, status);
    console.log(`🚪 Door ${door} closed`);
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      listener(door, status);
    });
  }

  public subscribe(listener: (door: number, status: DoorStatus) => void) {
    this.listeners.add(listener);
    console.log('📝 Door status listener added');

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
      console.log('📝 Door status listener removed');
    };
  }

  public getDoorStatus(door: number): DoorStatus | undefined {
    return this.doorStatuses.get(door);
  }

  public getAllDoorStatuses(): Map<number, DoorStatus> {
    return new Map(this.doorStatuses);
  }

  public isMQTTConnected(): boolean {
    return this.isConnected;
  }

  public disconnect() {
    if (this.mqttClient) {
      console.log('🔌 Disconnecting door status monitor');
      this.mqttClient.end();
      this.mqttClient = null;
      this.isConnected = false;
    }
  }
}

// Global instance
export const realDoorStatusMonitor = new RealDoorStatusMonitor();
