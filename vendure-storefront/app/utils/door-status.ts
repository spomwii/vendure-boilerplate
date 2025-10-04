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
    // Disable MQTT monitoring for now to prevent ESP32 conflicts
    // TODO: Implement proper MQTT monitoring without conflicts
    console.log('Door status monitor initialized (MQTT disabled to prevent ESP32 conflicts)');
  }

  private async initializeMQTT() {
    // MQTT monitoring disabled to prevent ESP32 conflicts
    console.log('MQTT monitoring disabled to prevent ESP32 subscription conflicts');
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
