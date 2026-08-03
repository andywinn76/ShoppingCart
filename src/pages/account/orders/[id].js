import Link from 'next/link';
import Image from 'next/image';
import { FiImage, FiCheck } from 'react-icons/fi';
import { getServerSession } from 'next-auth/next';
import Layout from '@/components/Layout';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';

export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: `/auth/signin?callbackUrl=${encodeURIComponent(ctx.resolvedUrl)}`,
        permanent: false,
      },
    };
  }
  const supabase = getSupabaseAdmin();
  // Scope the query to the signed-in user's own email so an order id from
  // another customer can't be viewed just by guessing the URL.
  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, status, total_cents, subtotal_cents, shipping_cents, tax_cents, currency,' +
        ' shipping_address, created_at, paid_at, fulfilled_at,' +
        ' order_items(id, product_name, variant_name, quantity, unit_price_cents, line_total_cents,' +
        ' product:products(product_images(url, alt, sort_order)))'
    )
    .eq('id', ctx.params.id)
    .eq('email', session.user.email.toLowerCase())
    .maybeSingle();
  if (!order) return { notFound: true };

  order.order_items = order.order_items.map(({ product, ...item }) => {
    const images = product?.product_images || [];
    const primary =
      images.find((img) => img.sort_order === 0) ||
      images.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
    return { ...item, thumbnail: primary ? { url: primary.url, alt: primary.alt } : null };
  });

  return { props: { order } };
}

const STEPS = ['pending', 'paid', 'fulfilled'];
const STEP_LABELS = { pending: 'Placed', paid: 'Paid', fulfilled: 'Fulfilled' };

function StatusProgress({ status }) {
  if (status === 'cancelled' || status === 'refunded') {
    return (
      <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm capitalize text-slate-600">
        This order was {status}.
      </p>
    );
  }
  const currentIdx = STEPS.indexOf(status);
  return (
    <div className="mt-4 flex items-center">
      {STEPS.map((step, idx) => (
        <div key={step} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ' +
                (idx <= currentIdx ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500')
              }
            >
              {idx < currentIdx ? <FiCheck size={14} /> : idx + 1}
            </div>
            <span className="mt-1 text-xs text-slate-600">{STEP_LABELS[step]}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={'mx-2 h-0.5 flex-1 ' + (idx < currentIdx ? 'bg-brand-600' : 'bg-slate-200')}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function AccountOrderDetail({ order }) {
  return (
    <Layout title={`Order #${order.id.slice(0, 8)}`}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/account/orders" className="text-sm text-brand-600 hover:underline">
          &lt;- Order history
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-semibold">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-slate-500">
            {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="card mt-4 p-4">
          <StatusProgress status={order.status} />
        </div>

        <div className="card mt-4 p-4">
          <h2 className="font-semibold">Items</h2>
          <ul className="mt-3 space-y-3">
            {order.order_items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 text-sm">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-slate-100">
                  {i.thumbnail ? (
                    <Image
                      src={i.thumbnail.url}
                      alt={i.thumbnail.alt || i.product_name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <FiImage size={20} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-slate-900">
                    {i.product_name}
                    {i.variant_name ? ` -- ${i.variant_name}` : ''}
                  </p>
                  <p className="text-slate-500">
                    {i.quantity} x {formatMoney(i.unit_price_cents, order.currency?.toUpperCase())}
                  </p>
                </div>
                <p className="font-medium">
                  {formatMoney(i.line_total_cents, order.currency?.toUpperCase())}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatMoney(order.subtotal_cents, order.currency?.toUpperCase())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Shipping</span>
              <span>{formatMoney(order.shipping_cents, order.currency?.toUpperCase())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax</span>
              <span>{formatMoney(order.tax_cents, order.currency?.toUpperCase())}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatMoney(order.total_cents, order.currency?.toUpperCase())}</span>
            </div>
          </div>
        </div>

        <div className="card mt-4 p-4">
          <h2 className="font-semibold">Shipping address</h2>
          {order.shipping_address ? (
            <p className="mt-2 text-sm text-slate-700">
              {order.shipping_address.name && <>{order.shipping_address.name}<br /></>}
              {order.shipping_address.line1 && <>{order.shipping_address.line1}<br /></>}
              {order.shipping_address.line2 && <>{order.shipping_address.line2}<br /></>}
              {[order.shipping_address.city, order.shipping_address.state, order.shipping_address.postal_code]
                .filter(Boolean)
                .join(', ')}
              <br />
              {order.shipping_address.country}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Not provided (digital order).</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
