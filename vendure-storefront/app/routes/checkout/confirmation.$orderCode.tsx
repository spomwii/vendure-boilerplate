// app/routes/confirmation.$orderCode.tsx
import type { DataFunctionArgs } from '@remix-run/server-runtime';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { CartContents } from '~/components/cart/CartContents';
import { CartTotals } from '~/components/cart/CartTotals';
import { OrderDetailFragment } from '~/generated/graphql';
import { getOrderByCode } from '~/providers/orders/order'; // adapt if your project uses a different path
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/solid';
import { useTranslation } from 'react-i18next';

type LoaderData = {
  order: OrderDetailFragment | null;
  vendingServiceUrl: string;
};

// Server loader: fetch order and expose vendingServiceUrl to the client
export async function loader({ params, request }: DataFunctionArgs) {
  try {
    const order = await getOrderByCode(params.orderCode!, { request });
    const vendingServiceUrl = process.env.VENDING_SERVICE_URL || '';
    return json<LoaderData>({ order, vendingServiceUrl });
  } catch (ex) {
    return json<LoaderData>({ order: null, vendingServiceUrl: '' });
  }
}

export default function ConfirmationPage() {
  const { order, vendingServiceUrl } = useLoaderData<LoaderData>();
  const { t } = useTranslation();

  // UI state
  const [unlocking, setUnlocking] = useState(false);
  const [unlockResult, setUnlockResult] = useState<string | null>(null);
  const [manualDoor, setManualDoor] = useState<number | ''>('');
  const [useManualDoor, setUseManualDoor] = useState(false);

  if (!order) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-semibold">Order not found</h2>
        <p>We could not find your order. Please check your order code.</p>
      </div>
    );
  }

  // Try to derive door number from the order object.
  // Adjust these paths to match how your Vendure order stores metadata/custom fields.
  function getDoorNumberFromOrder(): number | null {
    // Common places: customFields, metadata, or order lines' custom fields.
    // Update the keys below if your project stores the door number differently.
    try {
      // Example: order.customFields?.doorNumber
      // @ts-ignore
      const cf = order?.customFields;
      if (cf && cf.doorNumber) {
        const n = Number(cf.doorNumber);
        if (!isNaN(n)) return n;
      }

      // Fallback: check first order line custom field or variant SKU -> we could call vending-service to map SKU->door.
      const firstLine = order.lines && order.lines.length ? order.lines[0] : null;
      // @ts-ignore
      if (firstLine?.customFields?.doorNumber) {
        const n = Number(firstLine.customFields.doorNumber);
        if (!isNaN(n)) return n;
      }

      // No door number found
      return null;
    } catch (err) {
      return null;
    }
  }

  const inferredDoor = getDoorNumberFromOrder();

  async function handleOpenDoor(doorNumber: number) {
    setUnlocking(true);
    setUnlockResult(null);

    if (!vendingServiceUrl) {
      setUnlockResult('Vending service URL not configured.');
      setUnlocking(false);
      return;
    }

    try {
      const payload: Record<string, any> = {
        orderId: order.code,
        door: doorNumber,
      };
      // include email if present (optional)
      if (order?.customer?.email) payload.email = order.customer.email;

      const resp = await fetch(`${vendingServiceUrl}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        const err = data?.error || resp.statusText;
        setUnlockResult(`Unlock failed: ${err}`);
      } else {
        setUnlockResult('Unlock requested. If the door does not open, check the machine.');
      }
    } catch (err: any) {
      setUnlockResult(`Network error: ${err?.message || String(err)}`);
    } finally {
      setUnlocking(false);
    }
  }

  // UI: show order summary with Open door button
  return (
    <div className="p-8">
      <h2 className="text-3xl flex items-center space-x-2 font-light tracking-tight text-gray-900 my-8">
        <CheckCircleIcon className="text-green-600 w-8 h-8" />
        <span>{t ? t('order.summary') : 'Order summary'}</span>
      </h2>

      <p className="text-lg text-gray-700">
        {t ? t('checkout.orderSuccessMessage') : 'Thank you — your order is confirmed.'}{' '}
        <span className="font-bold">{order.code}</span>
      </p>

      <div className="mt-6">
        <div className="mb-6">
          <CartContents orderLines={order.lines} currencyCode={order.currencyCode} editable={false} />
        </div>
        <CartTotals order={order as OrderDetailFragment} />
      </div>

      <div className="rounded-md bg-blue-50 p-4 my-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3 flex-1 md:flex md:justify-between">
            <p className="text-sm text-blue-700">
              {t ? t('checkout.paymentMessage') : 'Your payment has been processed.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-medium">Open the vending machine</h3>
        <p className="text-sm text-gray-600 mb-3">
          {inferredDoor
            ? `Door ${inferredDoor} is mapped to this order (inferred from order data).`
            : 'No door is mapped automatically for this order. Enter a door number to open.'}
        </p>

        {!inferredDoor && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">Door number</label>
            <input
              type="number"
              value={useManualInput() ? manualDoorValue() : ''}
              onChange={(e) => setManualDoorInput(e.target.value ? Number(e.target.value) : '')}
              className="mt-1 block w-40 rounded-md border-gray-300 shadow-sm"
              placeholder="1"
            />
          </div>
        )}

        <div>
          <button
            onClick={() => handleOpenDoor(inferredDoor ?? (manualDoor as number))}
            disabled={unlocking}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            {unlocking ? 'Opening...' : `Open door #${inferredDoor ?? manualDoor}`}
          </button>

          {unlockResult && <div className="mt-3 text-sm text-gray-700">{unlockResult}</div>}
        </div>
      </div>
    </div>
  );

  // helper functions for manual input (kept local within component)
  function useManualInput() {
    return !inferredDoor;
  }
  function manualDoorValue() {
    return manualDoor === '' ? '' : String(manualDoor);
  }
  function setManualDoorInput(val: string | number) {
    setManualDoor(val === '' ? '' : Number(val));
  }
}