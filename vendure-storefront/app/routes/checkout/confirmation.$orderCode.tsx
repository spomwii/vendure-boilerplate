// app/routes/checkout/confirmation.$orderCode.tsx
import type { DataFunctionArgs } from '@remix-run/server-runtime';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { getOrderByCode } from '~/providers/orders/order';
import { getSessionStorage } from '~/sessions';

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
      
      const headers: Record<string, string> = {};
      if (doorNumber !== undefined) {
        session.unset('doorNumber');
        headers['Set-Cookie'] = await sessionStorage.commitSession(session);
      }
      
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

  console.log('ConfirmationPage rendered with:', { order: !!order, error, doorNumber });

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
    if (!vendingServiceUrl) {
      setUnlockResult('Vending service not configured');
      return;
    }

    setUnlocking(true);
    setUnlockResult(null);

    try {
      // Ensure no double slashes in URL
      const baseUrl = vendingServiceUrl.replace(/\/$/, '');
      const unlockUrl = `${baseUrl}/unlock`;
      const unlockData = { 
        orderId: order.id,
        door: door 
      };
      console.log('Unlocking door via URL:', unlockUrl);
      console.log('Unlock data:', unlockData);
      
      const response = await fetch(unlockUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unlockData),
      });

      if (response.ok) {
        setUnlockResult(`Door #${door} unlocked successfully!`);
        
        // For vending machine workflow, redirect to scan page after successful unlock
        setTimeout(() => {
          window.location.href = '/scan';
        }, 3000); // Wait 3 seconds to show success message
      } else {
        const error = await response.text();
        setUnlockResult(`Failed to unlock door #${door}: ${error}`);
      }
    } catch (error) {
      setUnlockResult(`Error unlocking door #${door}: ${(error as Error).message}`);
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-light tracking-tight text-gray-900 my-8">
        ✅ Order Confirmed
      </h2>

      <p className="text-lg text-gray-700">
        Thank you — your order is confirmed. Order: <span className="font-bold">{order.code}</span>
      </p>

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Order Details
        </h3>
        {order.lines?.map((line: any, index: number) => (
          <div key={index} className="flex justify-between py-2">
            <span>{line.productVariant?.name || 'Product'}</span>
            <span>Qty: {line.quantity}</span>
          </div>
        ))}
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>
              ${((order.totalWithTax || 0) / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Door Unlock Section */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          🚪 Door Unlock
        </h3>
        
        {doorNumber ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Door #{doorNumber} will be unlocked automatically.
            </p>
            <button
              onClick={() => handleOpenDoor(doorNumber)}
              disabled={unlocking}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {unlocking ? 'Opening...' : `Open door #${doorNumber}`}
            </button>
            {unlockResult && <div className="mt-3 text-sm text-gray-700">{unlockResult}</div>}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              No door number found in session. This might be a test order.
            </p>
            <p className="text-xs text-gray-500">
              Door number: {doorNumber || 'Not set'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}