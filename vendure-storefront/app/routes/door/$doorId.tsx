// app/routes/door/$doorId.tsx (Remix)
import type { LoaderFunctionArgs } from '@remix-run/server-runtime';
import { redirect } from '@remix-run/server-runtime';
import { getSessionStorage } from '~/sessions';
import { search, getProductBySlug } from '~/providers/products/products';
import { addItemToOrder } from '~/providers/orders/order';

// Minimal landing: map door -> sku via vending-service, persist door in session,
// resolve variant by SKU, add to cart, and go straight to payment.
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const doorId = params.doorId as string;
  const res = await fetch(
    `${process.env.VENDING_SERVICE_URL}/door/${doorId}`,
  );
  if (!res.ok) throw new Response('Not found', { status: 404 });
  const mapping: { door: number; deviceId: string; portIndex: number; productSku: string } = await res.json();

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
};

// No UI; this route just redirects.
export default function DoorPage() {
  return null;
}


