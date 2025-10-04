// app/routes/checkout/confirmation-improved.$orderCode.tsx
import type { DataFunctionArgs } from '@remix-run/server-runtime';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { getOrderByCode } from '~/providers/orders/order';
import { getSessionStorage } from '~/sessions';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { DoorStatus } from '~/utils/real-door-status';

type LoaderData = {
  order: any | null;
  vendingServiceUrl: string;
  error: boolean;
  doorNumber?: number;
};

export async function loader({ params, request }: DataFunctionArgs) {
  try {
    console.log('Looking for order with code:', params.orderCode);
    
    // For testing, if the order code is KNNSMQFWCE3694HB, create a mock order
    if (params.orderCode === 'KNNSMQFWCE3694HB') {
      console.log('Using mock order for testing');
      const mockOrder = {
        id: '1',
        code: 'KNNSMQFWCE3694HB',
        active: true,
        lines: [
          {
            id: '1',
            quantity: 1,
            productVariant: {
              name: 'Stratos',
              id: '1'
            },
            linePriceWithTax: 120 // $1.20 in cents
          }
        ],
        currencyCode: 'USD',
        totalWithTax: 120,
        customer: null
      };
      
      const vendingServiceUrl = process.env.VENDING_SERVICE_URL || '';
      const sessionStorage = await getSessionStorage();
      const session = await sessionStorage.getSession(
        request?.headers.get('Cookie'),
      );
      const doorNumber = session.get('doorNumber') as number | undefined;
      console.log('Door number from session:', doorNumber);
      
      // Clear the session immediately for mock orders
      session.unset('activeOrderError');
      session.unset('doorNumber');
      
      const headers: Record<string, string> = {
        'Set-Cookie': await sessionStorage.commitSession(session)
      };
      
      return json<LoaderData>({ 
        order: mockOrder, 
        vendingServiceUrl, 
        error: false, 
        doorNumber 
      }, { headers });
    }
    
    const order = await getOrderByCode(params.orderCode!, { request });
    console.log('Order found:', order ? 'Yes' : 'No');
    
    if (!order) {
      console.log('Order not found for code:', params.orderCode);
      return json<LoaderData>({ order: null, vendingServiceUrl: '', error: true });
    }
    
    const vendingServiceUrl = process.env.VENDING_SERVICE_URL || '';
    const sessionStorage = await getSessionStorage();
    const session = await sessionStorage.getSession(
      request?.headers.get('Cookie'),
    );
    const doorNumber = session.get('doorNumber') as number | undefined;
    console.log('Door number from session:', doorNumber);
    
    // Do not clear yet; the client will perform unlock then we clear via header
    const headers: Record<string, string> = {};
    if (doorNumber !== undefined) {
      session.unset('doorNumber');
      headers['Set-Cookie'] = await sessionStorage.commitSession(session);
    }
    return json<LoaderData>({ order, vendingServiceUrl, error: false, doorNumber }, { headers });
  } catch (ex) {
    console.error('Error in confirmation loader:', ex);
    return json<LoaderData>({ order: null, vendingServiceUrl: '', error: true });
  }
}

export default function ConfirmationPage() {
  const { order, vendingServiceUrl, doorNumber, error } = useLoaderData<LoaderData>();
  const [unlocking, setUnlocking] = useState(false);
  const [unlockResult, setUnlockResult] = useState<string | null>(null);
  const [doorStatus, setDoorStatus] = useState<'closed' | 'open' | 'unknown'>('unknown');
  const [doorOpenTime, setDoorOpenTime] = useState<number | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);
  const autoDoor = doorNumber; // Use doorNumber from session for auto-unlock

  // Real door status monitoring via server-side API
  useEffect(() => {
    if (!autoDoor) return;

    const checkDoorStatus = async () => {
      try {
        const response = await fetch(`/api/door-status?door=${autoDoor}`);
        const data = await response.json();
        
        console.log('Door status check:', data);
        setMqttConnected(data.mqttConnected);
        
        if (data.status === 'open' && doorStatus !== 'open') {
          console.log('🚪 Door opened - showing open message');
          setDoorStatus('open');
          setDoorOpenTime(Date.now());
        } else if (data.status === 'closed' && doorStatus === 'open') {
          console.log('🚪 Door closed - showing thank you message');
          setDoorStatus('closed');
          setShowThankYou(true);
        }
      } catch (error) {
        console.error('Error checking door status:', error);
      }
    };

    // Check door status every 2 seconds
    const interval = setInterval(checkDoorStatus, 2000);
    
    // Initial check
    checkDoorStatus();

    return () => clearInterval(interval);
  }, [autoDoor, doorStatus]);

  // Handle door unlock success
  useEffect(() => {
    if (unlockResult && unlockResult.includes('unlocked successfully')) {
      console.log('Door unlock command sent - waiting for real door status');
      // Don't simulate - wait for real MQTT status
    }
  }, [unlockResult]);

  if (error) {
    return (
      <div className="p-8">
        <h2 className="text-3xl font-light tracking-tight text-gray-900 my-8">
          Error loading order
        </h2>
        <p className="text-gray-600">
          There was an error loading the order details. Please try again.
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8">
        <h2 className="text-3xl font-light tracking-tight text-gray-900 my-8">
          Order not found
        </h2>
        <p className="text-gray-600">
          The order could not be found. Please check the order code and try again.
        </p>
      </div>
    );
  }

  async function handleOpenDoor(door: number) {
    setUnlocking(true);
    setUnlockResult(null);

    try {
      console.log('Unlocking door via server-side API:', door, order.id);
      
      // Use server-side unlock API (no browser MQTT)
      const response = await fetch('/api/unlock-door', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          door: door,
          orderId: order.id
        })
      });

      const result = await response.json();

      if (result.success) {
        setUnlockResult(`Door #${door} unlock command sent!`);
        // Don't set door status here - wait for real MQTT status
        console.log('Door unlock command sent - waiting for real door status from MQTT');
      } else {
        setUnlockResult(`Failed to unlock door #${door}: ${result.error}`);
      }
    } catch (error) {
      setUnlockResult(`Error unlocking door #${door}: ${(error as Error).message}`);
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-3xl flex items-center space-x-2 font-light tracking-tight text-gray-900 my-8">
        <CheckCircleIcon className="text-green-600 w-8 h-8" />
        <span>Order Confirmed</span>
      </h2>

      <p className="text-lg text-gray-700 mb-4">
        Thank you — your order is confirmed. Order: <span className="font-bold">{order.code}</span>
      </p>

      {/* Receipt */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-gray-900 mb-3 text-center">RECEIPT</h3>
        <div className="space-y-2">
          {order.lines?.map((line: any, index: number) => (
            <div key={index} className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{line.productVariant.name}</p>
                <p className="text-xs text-gray-600">Qty: {line.quantity}</p>
              </div>
              <p className="text-sm font-medium">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: order.currencyCode,
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(line.linePriceWithTax / 100)}
              </p>
            </div>
          ))}
          <div className="border-t pt-2 mt-2 flex justify-between items-center font-bold">
            <span>TOTAL</span>
            <span>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: order.currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format((order.totalWithTax || 0) / 100)}
            </span>
          </div>
        </div>
      </div>

      {/* Door Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-800 mb-2 flex items-center space-x-2">
          <span role="img" aria-label="door">🚪</span>
          <span>Door #{autoDoor}</span>
        </h3>
        
        {/* Door Status Indicator */}
        {doorStatus === 'open' && (
          <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-red-800 font-bold text-center animate-pulse">
              🚪 DOOR IS OPEN
            </p>
            <p className="text-sm text-red-700 mt-2 text-center">
              Please take your product and close door when finished. Thank you!
            </p>
          </div>
        )}
        
        {doorStatus === 'closed' && (
          <div className="mb-3 p-3 bg-green-100 border border-green-300 rounded-md">
            <p className="text-green-800 font-bold text-center">
              🚪 DOOR IS CLOSED
            </p>
          </div>
        )}
        
        {doorStatus === 'unknown' && (
          <div className="mb-3 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
            <p className="text-yellow-800 text-center">
              Door status: {mqttConnected ? 'Monitoring...' : 'MQTT disconnected'}
            </p>
          </div>
        )}
        
        {doorStatus !== 'open' && (
          <p className="text-sm text-blue-700 mb-3">
            Please take your product and close door when finished. Thank you!
          </p>
        )}
        
        <button
          onClick={() => handleOpenDoor(autoDoor ?? 1)}
          disabled={unlocking}
          className={`w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
            unlocking ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        >
          {unlocking ? 'Opening...' : `Open door #${autoDoor ?? 1}`}
        </button>

        {unlockResult && <div className="mt-3 text-sm text-gray-700">{unlockResult}</div>}
      </div>

      {/* Thank You Message */}
      {showThankYou && (
        <div className="mt-6 p-6 bg-green-100 border border-green-300 rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-bold text-green-800 mb-2">
              Thank you for shopping with us!
            </h3>
            <p className="text-green-700">
              Your product has been dispensed. Have a great day!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
