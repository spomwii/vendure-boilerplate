// app/routes/door/$doorId.tsx (Remix) - Vending Machine Door Route - UPDATED
import type { LoaderFunctionArgs } from '@remix-run/server-runtime';
import { redirect } from '@remix-run/server-runtime';
import { getSessionStorage } from '~/sessions';
import { search, getProductBySlug } from '~/providers/products/products';
import { addItemToOrder } from '~/providers/orders/order';

// Minimal landing: map door -> sku via vending-service, persist door in session,
// resolve variant by SKU, add to cart, and go straight to payment.
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  console.log('Door route loader started');
  const doorId = params.doorId as string;
  console.log('Door ID:', doorId);
  
  // Check if VENDING_SERVICE_URL is set
  console.log('VENDING_SERVICE_URL:', process.env.VENDING_SERVICE_URL ? 'SET' : 'NOT SET');
  if (!process.env.VENDING_SERVICE_URL) {
    console.error('VENDING_SERVICE_URL not set');
    throw new Response('Vending service not configured - VENDING_SERVICE_URL environment variable is missing', { status: 500 });
  }
  
  console.log(`Fetching door mapping for door ${doorId} from ${process.env.VENDING_SERVICE_URL}/door/${doorId}`);
  
  try {
    const res = await fetch(
      `${process.env.VENDING_SERVICE_URL}/door/${doorId}`,
    );
    
    if (!res.ok) {
      console.error(`Vending service returned ${res.status}: ${res.statusText}`);
      const errorText = await res.text();
      console.error('Vending service error response:', errorText);
      throw new Response(`Vending service error ${res.status}: ${errorText}`, { status: res.status });
    }
    
    const mapping: { door: number; deviceId: string; portIndex: number; productSku: string } = await res.json();
    console.log('Door mapping received:', mapping);

  // Persist door number in session for later (confirmation auto-unlock)
  const sessionStorage = await getSessionStorage();
  const session = await sessionStorage.getSession(
    request?.headers.get('Cookie'),
  );
  session.set('doorNumber', mapping.door);

  // Find product by SKU → get product slug, then resolve variant id by sku
  // 1) search by term = SKU to get product slug
  const searchResult = await search(
    {
      input: {
        groupByProduct: true,
        term: mapping.productSku,
        take: 1,
        skip: 0,
      },
    },
    { request },
  );
  const slug = searchResult.search.items?.[0]?.slug;
  if (!slug) {
    // fallback: go to homepage if product not found
    return redirect('/', {
      headers: {
        'Set-Cookie': await sessionStorage.commitSession(session),
      },
    });
  }

  // 2) fetch product details and resolve variant by SKU
  const { product } = await getProductBySlug(slug, { request });
  const variant = product?.variants?.find((v) => v.sku === mapping.productSku);
  if (!variant?.id) {
    return redirect(`/products/${slug}`, {
      headers: {
        'Set-Cookie': await sessionStorage.commitSession(session),
      },
    });
  }

  // 3) add the item to the order (cart)
  try {
    await addItemToOrder(variant.id, 1, { request });
  } catch (e) {
    // ignore add failure and still proceed to product page
    return redirect(`/products/${slug}`, {
      headers: {
        'Set-Cookie': await sessionStorage.commitSession(session),
      },
    });
  }

  // 4) go directly to vending checkout (simplified flow)
  return redirect('/checkout/vending', {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
  
  } catch (error) {
    console.error('Error in door route:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    
    throw new Response(`Door route error: ${errorMessage}`, { status: 500 });
  }
};

// No UI; this route just redirects.
export default function DoorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Door Route Working!
        </h1>
        <p className="text-gray-600">
          This confirms that the door route is being recognized.
        </p>
      </div>
    </div>
  );
}


