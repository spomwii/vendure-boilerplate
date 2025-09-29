// app/routes/door/$doorId.jsx  (Remix)
import { useLoaderData } from '@remix-run/react';

export const loader = async ({ params }) => {
  const res = await fetch(
    `${process.env.VENDING_SERVICE_URL}/door/${params.doorId}`,
  );
  if (!res.ok) throw new Response('Not found', { status: 404 });
  const data = await res.json(); // { door, deviceId, portIndex, productSku }
  // Optionally: fetch product details from your Vendure Storefront API here using productSku.
  return data;
};

export default function DoorPage() {
  const mapping = useLoaderData();
  return (
    <div style={{ padding: 20 }}>
      <h2>Door {mapping.door}</h2>
      <p>Product SKU: {mapping.productSku}</p>
      <p>
        Device: {mapping.deviceId} (port {mapping.portIndex})
      </p>
      {/* If you know storefront product URL for the SKU, link to it.
          Example: /products/:slug. If not, you can show product details or a direct add-to-cart button. */}
      <a href={`/products?sku=${mapping.productSku}`}>View product →</a>
    </div>
  );
}
