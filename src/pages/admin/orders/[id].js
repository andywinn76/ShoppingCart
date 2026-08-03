import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout, { withAdmin } from '@/components/AdminLayout';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';
import { ALLOWED_TRANSITIONS } from '@/lib/orderStatus';

export const getServerSideProps = withAdmin(async (ctx) => {
  const supabase = getSupabaseAdmin();
  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, status, email, subtotal_cents, shipping_cents, tax_cents, total_cents, currency,' +
        ' stripe_session_id, stripe_payment_intent_id, shipping_address, billing_address, notes,' +
        ' created_at, paid_at, fulfilled_at,' +
        ' order_items(id, product_name, variant_name, quantity, unit_price_cents, line_total_cents)'
    )
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!order) return { notFound: true };
  return { props: { order } };
});

function Address({ label, address }) {
  if (!address) {
    return (
      <div>
        <h3 className="text-xs font-semibold uppercase text-slate-500">{label}</h3>
        <p className="mt-1 text-sm text-slate-400">Not provided.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-slate-500">{label}</h3>
      <p className="mt-1 text-sm text-slate-700">
        {address.name && <>{address.name}<br /></>}
        {address.line1 && <>{address.line1}<br /></>}
        {address.line2 && <>{address.line2}<br /></>}
        {[address.city, address.state, address.postal_code].filter(Boolean).join(', ')}
        {address.city || address.state || address.postal_code ? <br /> : null}
        {address.country}
      </p>
    </div>
  );
}

export default function AdminOrderDetail({ order: initial }) {
  const router = useRouter();
  const [order, setOrder] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [needsForce, setNeedsForce] = useState(false);

  async function changeStatus(status) {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) {
      setOrder((prev) => ({ ...prev, status }));
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error || 'Could not update status.');
  }

  async function deleteOrder(force) {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/orders/${order.id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
    });
    setBusy(false);
    if (res.ok) {
      router.push('/admin/orders');
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.requiresForce) {
      setNeedsForce(true);
    } else {
      setError(data.error || 'Could not delete order.');
      setConfirmingDelete(false);
    }
  }

  const canFulfill = ALLOWED_TRANSITIONS[order.status]?.includes('fulfilled');
  const canCancel = ALLOWED_TRANSITIONS[order.status]?.includes('cancelled');

  return (
    <AdminLayout title={`Order #${order.id.slice(0, 8)}`}>
      <Link href="/admin/orders" className="text-sm text-brand-600 hover:underline">
        &lt;- Orders
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Order #{order.id.slice(0, 8)}</h1>
        <div className="flex flex-wrap gap-2">
          {canFulfill && (
            <button className="btn-primary" onClick={() => changeStatus('fulfilled')} disabled={busy}>
              Mark Fulfilled
            </button>
          )}
          {canCancel && (
            <button className="btn-outline" onClick={() => changeStatus('cancelled')} disabled={busy}>
              Cancel Order
            </button>
          )}
          <button
            className="btn-outline border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="font-semibold">Line items</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-600">
              <tr>
                <th className="pb-2">Product</th>
                <th className="pb-2">Qty</th>
                <th className="pb-2">Unit price</th>
                <th className="pb-2">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items.map((i) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="py-2">
                    {i.product_name}
                    {i.variant_name ? ` -- ${i.variant_name}` : ''}
                  </td>
                  <td className="py-2">{i.quantity}</td>
                  <td className="py-2">{formatMoney(i.unit_price_cents, order.currency?.toUpperCase())}</td>
                  <td className="py-2">{formatMoney(i.line_total_cents, order.currency?.toUpperCase())}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        </section>

        <div className="space-y-6">
          <section className="card p-4">
            <h2 className="font-semibold">Customer</h2>
            <p className="mt-2 text-sm text-slate-700">{order.email}</p>
            <div className="mt-4 space-y-4">
              <Address label="Shipping address" address={order.shipping_address} />
              <Address label="Billing address" address={order.billing_address} />
            </div>
          </section>

          <section className="card p-4">
            <h2 className="font-semibold">Payment</h2>
            <dl className="mt-2 space-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase text-slate-500">Stripe session</dt>
                <dd className="break-all font-mono text-xs">{order.stripe_session_id || '--'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Payment intent</dt>
                <dd className="break-all font-mono text-xs">{order.stripe_payment_intent_id || '--'}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-4">
            <h2 className="font-semibold">Timeline</h2>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-slate-500">Placed</span>
                <span>{new Date(order.created_at).toLocaleString()}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">Paid</span>
                <span>{order.paid_at ? new Date(order.paid_at).toLocaleString() : '--'}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">Fulfilled</span>
                <span>{order.fulfilled_at ? new Date(order.fulfilled_at).toLocaleString() : '--'}</span>
              </li>
            </ul>
          </section>
        </div>
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-5">
            {!needsForce ? (
              <>
                <h2 className="text-lg font-semibold">Delete order?</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Order #{order.id.slice(0, 8)} ({order.status}) will be permanently removed. This
                  cannot be undone.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-red-700">Are you sure?</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Order #{order.id.slice(0, 8)} is <strong>{order.status}</strong>, not
                  pending/cancelled. Deleting it removes a record of a completed transaction.
                  Confirm again to proceed anyway.
                </p>
              </>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="btn-outline"
                onClick={() => {
                  setConfirmingDelete(false);
                  setNeedsForce(false);
                }}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="btn-primary bg-red-600 hover:bg-red-700"
                onClick={() => deleteOrder(needsForce)}
                disabled={busy}
              >
                {busy ? 'Deleting...' : needsForce ? 'Delete anyway' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
