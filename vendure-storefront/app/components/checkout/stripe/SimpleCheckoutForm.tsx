import { useState } from 'react';
import { CreditCardIcon } from '@heroicons/react/24/solid';

export const SimpleCheckoutForm = ({ 
  orderCode, 
  onPaymentSuccess 
}: { 
  orderCode: string;
  onPaymentSuccess: (orderCode: string) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('Processing payment...');

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a real payment by calling the payment action
      const formData = new FormData();
      formData.append('paymentMethodCode', 'stripe');
      formData.append('paymentNonce', 'test-payment-nonce');
      
      const response = await fetch('/checkout/vending-payment', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        // The server will redirect us to the confirmation page
        const redirectUrl = response.url;
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          // Fallback: use the current order code
          onPaymentSuccess(orderCode);
        }
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      setMessage('Payment failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-yellow-800">Test Payment Form</h3>
        <p className="text-sm text-yellow-700 mt-1">
          This is a simplified test form. In production, this would be replaced with Stripe.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Card Number</label>
          <input
            type="text"
            placeholder="4242 4242 4242 4242"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            defaultValue="4242 4242 4242 4242"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Expiry</label>
            <input
              type="text"
              placeholder="12/34"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              defaultValue="12/34"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CVC</label>
            <input
              type="text"
              placeholder="123"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              defaultValue="123"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 items-center justify-center space-x-2 py-3 my-4 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <CreditCardIcon className="w-5 h-5" />
        <span>{isLoading ? 'Processing...' : 'Pay with Test Form'}</span>
      </button>

      {message && (
        <div className="text-sm text-gray-600 text-center">
          {message}
        </div>
      )}
    </form>
  );
};
