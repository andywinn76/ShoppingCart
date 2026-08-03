import Link from 'next/link';
import Image from 'next/image';
import { FiImage } from 'react-icons/fi';
import { getServerSession } from 'next-auth/next';
import Layout from '@/components/Layout';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';

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
        ' order_items(product_name, variant_name, quantity, product:products(product_images(url, alt, sort_order)))'
    )
    .eq('email', session.user.email.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(50);

  // Attach each line item's primary (sort_order 0, or lowest available) thumbnail
  // and drop the rest of the nested image data so the client only gets what it renders.
  const withThumbnails = (orders || []).map((o) => ({
    ...o,
    order_items: o.order_items.map(({ product, ...item }) => {
      const images = product?.product_images || [];
      const primary =
        images.find((img) => img.sort_order === 0) ||
        images.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
      return { ...item, thumbnail: primary ? { url: primary.url, alt: primary.alt } : null };
    }),
  }));

  return { props: { orders: withThumbnails } };
}

export default function OrdersPage({ orders }) {
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
