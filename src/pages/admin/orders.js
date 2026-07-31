import AdminLayout, { withAdmin } from '@/components/AdminLayout';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';

export const getServerSideProps = withAdmin(async () => {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('orders')
    .select(
      'id, status, email, subtotal_cents, shipping_cents, tax_cents, total_cents, created_at, paid_at, order_items(product_name, variant_name, quantity)'
    )
    .order('created_at', { ascending: false })
    .limit(100);
  return { props: { orders: data || [] } };
});

export default function AdminOrders({ orders }) {
  return (
    <AdminLayout title="Orders">
      <h1 className="text-2xl font-semibold">Orders</h1>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Items</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-slate-100 align-top">
                <td className="p-3 font-mono text-xs">#{o.id.slice(0, 8)}</td>
                <td className="p-3">{o.email}</td>
                <td className="p-3 text-xs">
                  {o.order_items.map((i, idx) => (
                    <div key={idx}>
                      {i.quantity} x {i.product_name}
                      {i.variant_name ? ` -- ${i.variant_name}` : ''}
                    </div>
                  ))}
                </td>
                <td className="p-3">{formatMoney(o.total_cents)}</td>
                <td className="p-3 capitalize">
                  <StatusBadge status={o.status} />
                </td>
                <td className="p-3 text-xs text-slate-500">
                  {new Date(o.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    fulfilled: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-slate-200 text-slate-700',
    refunded: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status] || 'bg-slate-100'}`}>
      {status}
    </span>
  );
}
