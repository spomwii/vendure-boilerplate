// Server-side door unlock API route
import type { ActionFunctionArgs } from '@remix-run/server-runtime';
import { json } from '@remix-run/node';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { door, orderId } = body;

    if (!door || !orderId) {
      return json({ error: 'door and orderId are required' }, { status: 400 });
    }

    console.log('Server-side unlock request:', { door, orderId });

    // Import MQTT on server side (Node.js environment)
    const mqtt = await import('mqtt');
    
    // MQTT configuration
    const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
    const MQTT_PORT = 8883;
    const MQTT_USER = 'mqttuser';
    const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';
    
    const clientId = 'server-unlock-' + Math.random().toString(36).substr(2, 9);
    
    console.log('Connecting to MQTT from server:', clientId);
    
    // Create MQTT connection
    const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
      username: MQTT_USER,
      password: MQTT_PASS,
      clientId: clientId,
      clean: true,
      reconnectPeriod: 0
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        client.end();
        resolve(json({ 
          success: false, 
          error: 'MQTT connection timeout' 
        }, { status: 500 }));
      }, 10000);

      client.on('connect', () => {
        console.log('Server MQTT connected, sending unlock command');
        
        // Create unlock message
        const unlockMessage = {
          type: 'unlock',
          port: door - 1, // Convert door number to port index
          orderId: orderId,
          token: 'SERVER-UNLOCK-' + Date.now(),
          durationMs: 600
        };

        const topic = 'vending/esp-test-1/cmd';
        const payload = JSON.stringify(unlockMessage);

        console.log('Publishing unlock from server:', topic, payload);

        client.publish(topic, payload, { qos: 1 }, (err) => {
          clearTimeout(timeout);
          client.end();
          
          if (err) {
            console.error('Server MQTT publish error:', err);
            resolve(json({ 
              success: false, 
              error: 'Failed to publish unlock command' 
            }, { status: 500 }));
          } else {
            console.log('Server unlock command sent successfully');
            resolve(json({ 
              success: true, 
              message: `Door #${door} unlock command sent` 
            }));
          }
        });
      });

      client.on('error', (error) => {
        clearTimeout(timeout);
        client.end();
        console.error('Server MQTT error:', error);
        resolve(json({ 
          success: false, 
          error: 'MQTT connection failed' 
        }, { status: 500 }));
      });
    });

  } catch (error: any) {
    console.error('Server unlock error:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
