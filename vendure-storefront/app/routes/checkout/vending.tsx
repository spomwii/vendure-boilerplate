import { FormEvent, useState } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import {
  Form,
  useLoaderData,
  useNavigate,
  useOutletContext,
} from '@remix-run/react';
import { OutletContext } from '~/types';
import { DataFunctionArgs, json, redirect } from '@remix-run/server-runtime';
import { getSessionStorage } from '~/sessions';
import { classNames } from '~/utils/class-names';
import { getActiveOrder } from '~/providers/orders/order';
import { useTranslation } from 'react-i18next';

export async function loader({ request }: DataFunctionArgs) {
  const session = await getSessionStorage().then((sessionStorage) =>
    sessionStorage.getSession(request?.headers.get('Cookie')),
  );

  const activeOrder = await getActiveOrder({ request });

  //check if there is an active order if not redirect to homepage
  if (
    !session ||
    !activeOrder ||
    !activeOrder.active ||
    activeOrder.lines.length === 0
  ) {
    return redirect('/');
  }

  const error = session.get('activeOrderError');
  return json({
    error,
    activeOrder,
  });
}

export default function VendingCheckout() {
  const { error, activeOrder } = useLoaderData<typeof loader>();
  const { activeOrderFetcher } = useOutletContext<OutletContext>();
  const [emailFormChanged, setEmailFormChanged] = useState(false);
  const [email, setEmail] = useState('');
  let navigate = useNavigate();
  const { t } = useTranslation();

  // Add error boundary to prevent crashes
  if (!activeOrder) {
    return (
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Order</h2>
        <p className="text-gray-600 mb-4">Please scan a QR code to add a product to your cart.</p>
        <button
          onClick={() => navigate('/scan')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Scan QR Code
        </button>
      </div>
    );
  }

  const { customer } = activeOrder ?? {};
  // For vending machine, we don't require a customer - just need items in cart
  const canProceedToPayment = activeOrder?.lines?.length > 0;

  const submitEmailForm = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const { emailAddress } = Object.fromEntries<any>(formData.entries());
    const isValid = event.currentTarget.checkValidity();
    if (emailFormChanged && isValid && emailAddress) {
      activeOrderFetcher.submit(formData, {
        method: 'post',
        action: '/api/active-order',
      });
      setEmailFormChanged(false);
    }
  };

  function navigateToPayment() {
    navigate('./vending-payment');
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Vending Machine Checkout
        </h2>
        <p className="text-gray-600">
          Enter your email for receipt (optional)
        </p>
      </div>

      {/* Product Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-2">Your Selection</h3>
        {activeOrder?.lines?.map((line, index) => (
          <div key={index} className="flex justify-between items-center py-2">
            <div>
              <p className="font-medium">{line.productVariant.name}</p>
              <p className="text-sm text-gray-600">Qty: {line.quantity}</p>
            </div>
            <p className="font-medium">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: activeOrder.currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(line.linePriceWithTax / 100)}
            </p>
          </div>
        ))}
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center font-bold text-lg">
            <span>Total</span>
            <span>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: activeOrder?.currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format((activeOrder?.totalWithTax || 0) / 100)}
            </span>
          </div>
        </div>
      </div>

      {/* Email Form */}
      <Form
        method="post"
        action="/api/active-order"
        onBlur={submitEmailForm}
        onChange={() => setEmailFormChanged(true)}
        className="mb-6"
      >
        <input type="hidden" name="action" value="setOrderCustomer" />
        <div>
          <label
            htmlFor="emailAddress"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address (Optional)
          </label>
          <input
            type="email"
            id="emailAddress"
            name="emailAddress"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            We'll send you a receipt if you provide an email
          </p>
          {error?.errorCode === 'EMAIL_ADDRESS_CONFLICT_ERROR' && (
            <p className="mt-2 text-sm text-red-600" id="email-error">
              {error.message}
            </p>
          )}
        </div>
      </Form>

      {/* Proceed to Payment Button */}
      <button
        type="button"
        disabled={!canProceedToPayment}
        onClick={navigateToPayment}
        className={classNames(
          canProceedToPayment
            ? 'bg-primary-600 hover:bg-primary-700'
            : 'bg-gray-400',
          'flex w-full items-center justify-center space-x-2 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
        )}
      >
        <LockClosedIcon className="w-5 h-5" />
        <span>Proceed to Payment</span>
      </button>
    </div>
  );
}
