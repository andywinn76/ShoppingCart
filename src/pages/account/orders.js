import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FiImage } from 'react-icons/fi';
import { getServerSession } from 'next-auth/next';
import Layout from '@/components/Layout';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';
import { useCart } from '@/context/CartContext';

export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) {
    return { redirect: { destination: '/auth/signin?callbackUrl=/account/orders', permanent: false } };
  }
  const supabase = getSupabaseAdmin();
  const { data: orders } = await supabase
    .from('orders')
    .select(
      'id, status, total_cents, currency, created_at,' +
        ' order_items(product_id, variant_id, product_name, variant_name, quantity,' +
        ' product:products(name, product_type, active, base_price_cents, product_images(url, alt, sort_order)),' +
        ' variant:product_variants(name, price_cents, inventory, active))'
    )
    .eq('email', session.user.email.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(50);

  // Resolve each line item's thumbnail and current buy-again availability from
  // today's product/variant state -- not the order's snapshot fields, which
  // only reflect what was true at checkout time.
  const withThumbnails = (orders || []).map((o) => ({
    ...o,
    order_items: o.order_items.map(({ product, variant, ...item }) => {
      const images = product?.product_images || [];
      const primary =
        images.find((img) => img.sort_order === 0) ||
        images.slice().sort((a, b) => a.sort_order - b.sort_order)[0];

      const available =
        !!variant &&
        variant.active &&
        !!product &&
        product.active &&
        (product.product_type === 'digital' || variant.inventory > 0);

      return {
        ...item,
        thumbnail: primary ? { url: primary.url, alt: primary.alt } : null,
        available,
        reorder: available
          ? {
              variant_id: item.variant_id,
              product_id: item.product_id,
              product_name: product.name,
              variant_name: variant.name,
              unit_price_cents: variant.price_cents ?? product.base_price_cents,
              product_type: product.product_type,
              image: primary?.url || null,
            }
          : null,
      };
    }),
  }));

  return { props: { orders: withThumbnails } };
}

export default function OrdersPage({ orders }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [message, setMessage] = useState({});

  function buyAgain(order) {
    const available = order.order_items.filter((i) => i.available);
    available.forEach((i) => addItem({ ...i.reorder, quantity: i.quantity }));

    const skipped = order.order_items.length - available.length;
    if (available.length === 0) {
      setMessage((prev) => ({ ...prev, [order.id]: 'None of these items are available anymore.' }));
      return;
    }
    setMessage((prev) => ({
      ...prev,
      [order.id]:
        skipped > 0
          ? `Added ${available.length} of ${order.order_items.length} items to your cart -- ${skipped} no longer available.`
          : `Added ${available.length} item${available.length === 1 ? '' : 's'} to your cart.`,
    }));
  }

  return (
    <Layout title="Order history">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/account" className="text-sm text-brand-600 hover:underline">
          &lt;- Account
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Order history</h1>
        {orders.length === 0 ? (
          <p className="mt-4 text-slate-500">You haven&apos;t placed any orders yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="text-sm text-brand-600 hover:underline"
                    >
                      Order #{o.id.slice(0, 8)} &middot; {new Date(o.created_at).toLocaleDateString()}
                    </Link>
                    <p className="mt-1 text-sm capitalize">
                      Status: <span className="font-medium">{o.status}</span>
                    </p>
                  </div>
                  <p className="font-medium">{formatMoney(o.total_cents, o.currency?.toUpperCase())}</p>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {o.order_items.map((i, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
                        {i.thumbnail ? (
                          <Image
                            src={i.thumbnail.url}
                            alt={i.thumbnail.alt || i.product_name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <FiImage size={18} />
                          </div>
                        )}
                      </div>
                      <span>
                        {i.quantity} x {i.product_name}
                        {i.variant_name ? ` -- ${i.variant_name}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    className="btn-outline text-sm"
                    onClick={() => buyAgain(o)}
                    disabled={!o.order_items.some((i) => i.available)}
                  >
                    Buy again
                  </button>
                  {message[o.id] && (
                    <p className="text-xs text-slate-600">
                      {message[o.id]}{' '}
                      {o.order_items.some((i) => i.available) && (
                        <button
                          onClick={() => router.push('/cart')}
                          className="text-brand-600 hover:underline"
                        >
                          View cart
                        </button>
                      )}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
