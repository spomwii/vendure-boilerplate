// Simple door test route without vending service dependency
import type { LoaderFunctionArgs } from '@remix-run/server-runtime';

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const doorId = params.doorId as string;
  
  // Just return a simple response to test if the route works
  return new Response(JSON.stringify({ 
    message: 'Door test route working', 
    doorId,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export default function DoorTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Door Test Route Working!
        </h1>
        <p className="text-gray-600">
          This is a simple door test route without vending service dependency.
        </p>
      </div>
    </div>
  );
}
