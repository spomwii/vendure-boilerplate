// Test vending service connectivity
import type { LoaderFunctionArgs } from '@remix-run/server-runtime';
import { useLoaderData } from '@remix-run/react';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log('Testing vending service connectivity...');
  
  if (!process.env.VENDING_SERVICE_URL) {
    return new Response(JSON.stringify({ 
      error: 'VENDING_SERVICE_URL not set',
      vendingServiceUrl: null 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    console.log('Fetching from:', process.env.VENDING_SERVICE_URL);
    const res = await fetch(process.env.VENDING_SERVICE_URL);
    const status = res.status;
    const statusText = res.statusText;
    
    console.log('Vending service response:', { status, statusText });
    
    return new Response(JSON.stringify({ 
      vendingServiceUrl: process.env.VENDING_SERVICE_URL,
      status,
      statusText,
      ok: res.ok
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Vending service error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      vendingServiceUrl: process.env.VENDING_SERVICE_URL
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default function TestVendingPage() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Testing Vending Service
        </h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
