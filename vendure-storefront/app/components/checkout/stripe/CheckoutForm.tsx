import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { FormEvent, useState } from 'react';
import { CreditCardIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';

export const CheckoutForm = ({ orderCode }: { orderCode: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('CheckoutForm rendered with orderCode:', orderCode);
  console.log('Stripe loaded:', !!stripe);
  console.log('Elements loaded:', !!elements);

  const handleSubmit = async (event: FormEvent) => {
    // We don't want to let default form submission happen here,
    // which would refresh the page.
    event.preventDefault();

    if (!stripe || !elements) {
      console.log('Stripe not ready:', { stripe: !!stripe, elements: !!elements });
      setError('Payment system not ready. Please try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Confirming payment...');
      console.log('Order code:', orderCode);
      console.log('Return URL:', location.origin + `/checkout/confirmation/${orderCode}`);
      
      const result = await stripe.confirmPayment({
        //`Elements` instance that was used to create the Payment Element
        elements,
        confirmParams: {
          return_url: location.origin + `/checkout/confirmation/${orderCode}`,
        },
      });

      console.log('Stripe confirmPayment result:', result);

      if (result.error) {
        // Show error to your customer (for example, payment details incomplete)
        console.error('Payment error:', result.error);
        console.error('Error code:', result.error.code);
        console.error('Error type:', result.error.type);
        setError(result.error.message || 'Payment failed. Please try again.');
      } else {
        console.log('Payment successful, redirecting...');
        // Your customer will be redirected to your `return_url`. For some payment
        // methods like iDEAL, your customer will be redirected to an intermediate
        // site first to authorize the payment, then redirected to the `return_url`.
      }
    } catch (err) {
      console.error('Payment exception:', err);
      console.error('Exception details:', err);
      setError('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || isLoading}
        className={`flex w-full px-6 items-center justify-center space-x-2 py-3 my-4 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
          !stripe || isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-primary-600 hover:bg-primary-700'
        }`}
        onClick={() => console.log('Pay button clicked, stripe:', !!stripe, 'loading:', isLoading)}
      >
        <CreditCardIcon className="w-5 h-5"></CreditCardIcon>
        <span>
          {isLoading ? 'Processing...' : `${t('checkout.payWith')} Stripe`}
        </span>
      </button>
      
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500">
        Stripe loaded: {stripe ? 'Yes' : 'No'} | Elements: {elements ? 'Yes' : 'No'}
      </div>
    </form>
  );
};
