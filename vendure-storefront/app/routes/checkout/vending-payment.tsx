import { DataFunctionArgs, json, redirect } from '@remix-run/server-runtime';
import {
  addPaymentToOrder,
  createStripePaymentIntent,
  getEligiblePaymentMethods,
  getNextOrderStates,
  transitionOrderToState,
} from '~/providers/checkout/checkout';
import { useLoaderData, useOutletContext } from '@remix-run/react';
import { OutletContext } from '~/types';
import { CurrencyCode, ErrorCode, ErrorResult } from '~/generated/graphql';
import { StripePayments } from '~/components/checkout/stripe/StripePayments';
import { SimpleCheckoutForm } from '~/components/checkout/stripe/SimpleCheckoutForm';
import { getActiveOrder } from '~/providers/orders/order';
import { getSessionStorage } from '~/sessions';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from '@remix-run/react';

export async function loader({ params, request }: DataFunctionArgs) {
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

  const { eligiblePaymentMethods } = await getEligiblePaymentMethods({
    request,
  });
  const error = session.get('activeOrderError');
  
  // Only process Stripe payment method
  const stripeMethod = eligiblePaymentMethods.find((method) => 
    method.code.includes('stripe')
  );
  
  console.log('Eligible payment methods:', eligiblePaymentMethods.map(m => m.code));
  console.log('Stripe method found:', stripeMethod ? 'Yes' : 'No');
  console.log('STRIPE_PUBLISHABLE_KEY set:', !!process.env.STRIPE_PUBLISHABLE_KEY);
  
  let stripePaymentIntent: string | undefined;
  let stripePublishableKey: string | undefined;
  let stripeError: string | undefined;
  
  if (stripeMethod) {
    try {
      console.log('Creating Stripe payment intent...');
      const stripePaymentIntentResult = await createStripePaymentIntent({
        request,
      });
      stripePaymentIntent =
        stripePaymentIntentResult.createStripePaymentIntent ?? undefined;
      stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
      console.log('Stripe payment intent created:', !!stripePaymentIntent);
      console.log('Stripe publishable key set:', !!stripePublishableKey);
    } catch (e: any) {
      console.error('Stripe payment intent error:', e.message);
      stripeError = e.message;
    }
  } else {
    console.log('No Stripe payment method found');
  }

  return json({
    stripePaymentIntent,
    stripePublishableKey,
    stripeError,
    error,
    activeOrder,
  });
}

export async function action({ params, request }: DataFunctionArgs) {
  const body = await request.formData();
  const paymentMethodCode = body.get('paymentMethodCode');
  const paymentNonce = body.get('paymentNonce');
  
  console.log('Payment action called with method:', paymentMethodCode);
  
  if (typeof paymentMethodCode === 'string') {
    const { nextOrderStates } = await getNextOrderStates({
      request,
    });
    console.log('Next order states:', nextOrderStates);
    
    if (nextOrderStates.includes('ArrangingPayment')) {
      console.log('Transitioning to ArrangingPayment state');
      const transitionResult = await transitionOrderToState(
        'ArrangingPayment',
        { request },
      );
      console.log('Transition result:', transitionResult.transitionOrderToState?.__typename);
      if (transitionResult.transitionOrderToState?.__typename !== 'Order') {
        throw new Response('Not Found', {
          status: 400,
          statusText: transitionResult.transitionOrderToState?.message,
        });
      }
    }

    console.log('Adding payment to order...');
    const result = await addPaymentToOrder(
      { method: paymentMethodCode, metadata: { nonce: paymentNonce } },
      { request },
    );
    console.log('Payment result:', result.addPaymentToOrder?.__typename);
    console.log('Order code:', result.addPaymentToOrder?.code);
    
    if (result.addPaymentToOrder.__typename === 'Order') {
      return redirect(
        `/checkout/confirmation/${result.addPaymentToOrder.code}`,
      );
    } else {
      console.error('Payment failed:', result.addPaymentToOrder?.message);
      throw new Response('Not Found', {
        status: 400,
        statusText: result.addPaymentToOrder?.message,
      });
    }
  }
}

export default function VendingPayment() {
  const {
    stripePaymentIntent,
    stripePublishableKey,
    stripeError,
    error,
    activeOrder,
  } = useLoaderData<typeof loader>();
  const { activeOrderFetcher } = useOutletContext<OutletContext>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const paymentError = getPaymentError(error);

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/checkout/vending')}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to checkout
        </button>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment
        </h2>
        <p className="text-gray-600">
          Complete your purchase securely
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-2">Order Summary</h3>
        {activeOrder?.lines?.map((line, index) => (
          <div key={index} className="flex justify-between items-center py-1">
            <div>
              <p className="text-sm font-medium">{line.productVariant.name}</p>
              <p className="text-xs text-gray-600">Qty: {line.quantity}</p>
            </div>
            <p className="text-sm font-medium">
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
          <div className="flex justify-between items-center font-bold">
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

      {/* Stripe Payment */}
      <div className="bg-white border rounded-lg p-6">
        {stripeError ? (
          <div className="text-center">
            <p className="text-red-700 font-bold mb-2">
              Payment Setup Error
            </p>
            <p className="text-sm text-red-600">{stripeError}</p>
          </div>
        ) : !stripePaymentIntent || !stripePublishableKey ? (
          <div className="text-center">
            <p className="text-red-700 font-bold mb-2">
              Stripe Configuration Missing
            </p>
            <p className="text-sm text-red-600">
              Payment intent: {stripePaymentIntent ? 'Set' : 'Missing'}<br/>
              Publishable key: {stripePublishableKey ? 'Set' : 'Missing'}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Debug Mode:</strong> Using simple test form instead of Stripe
              </p>
            </div>
            <SimpleCheckoutForm 
              orderCode={activeOrder?.code ?? ''} 
              onPaymentSuccess={(orderCode) => {
                window.location.href = `/checkout/confirmation/${orderCode}`;
              }}
            />
          </div>
        )}
      </div>

      {paymentError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{paymentError}</p>
        </div>
      )}
    </div>
  );
}

function getPaymentError(error?: ErrorResult): string | undefined {
  if (!error || !error.errorCode) {
    return undefined;
  }
  switch (error.errorCode) {
    case ErrorCode.OrderPaymentStateError:
    case ErrorCode.IneligiblePaymentMethodError:
    case ErrorCode.PaymentFailedError:
    case ErrorCode.PaymentDeclinedError:
    case ErrorCode.OrderStateTransitionError:
    case ErrorCode.NoActiveOrderError:
      return error.message;
  }
}
