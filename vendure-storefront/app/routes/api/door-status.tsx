// Server-side door status API
import type { LoaderFunctionArgs } from '@remix-run/server-runtime';
import { json } from '@remix-run/node';
import { realDoorStatusMonitor } from '~/utils/real-door-status';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const door = url.searchParams.get('door');
  
  if (!door) {
    return json({ error: 'door parameter is required' }, { status: 400 });
  }

  const doorNumber = parseInt(door);
  const doorStatus = realDoorStatusMonitor.getDoorStatus(doorNumber);
  const isConnected = realDoorStatusMonitor.isMQTTConnected();

  return json({
    door: doorNumber,
    status: doorStatus?.status || 'unknown',
    timestamp: doorStatus?.timestamp || null,
    orderId: doorStatus?.orderId || null,
    mqttConnected: isConnected
  });
}
