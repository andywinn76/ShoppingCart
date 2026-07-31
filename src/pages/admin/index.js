import Link from 'next/link';
import AdminLayout, { withAdmin } from '@/components/AdminLayout';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';

export const getServerSideProps = withAdmin(async () => {
  const supabase = getSupabaseAdmin();
  const [products, orders, lowStock] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase
      .from('orders')
      .select('id, total_cents, status, created_at, email')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('product_variants')
      .select('id, name, inventory, product:products(name, product_type)')
      .lt('inventory', 5)
      .limit(10),
  ]);
  return {
    props: {
      productCount: products.count || 0,
      recentOrders: orders.data || [],
      lowStock: (lowStock.data || []).filter(
        (v) => v.product?.product_type !== 'digital'
      ),
    },
  };
});

export default function AdminDashboard({ productCount, recentOrders, lowStock }) {
  return (
    <AdminLayout title="Dashboard">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Products" value={productCount} href="/admin/products" />
        <Stat label="Recent orders" value={recentOrders.length} href="/admin/orders" />
        <Stat label="Low stock alerts" value={lowStock.length} href="/admin/inventory" />
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">#{o.id.slice(0, 8)}</p>
                  <p className="text-slate-500">{o.email}</p>
                </div>
                <div className="text-right">
                  <p>{formatMoney(o.total_cents)}</p>
                  <p className="capitalize text-slate-500">{o.status}</p>
                </div>
              </li>
            ))}
            {recentOrders.length === 0 && <p className="text-slate-500">No orders yet.</p>}
          </ul>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Low stock</h2>
            <Link href="/admin/inventory" className="text-sm text-brand-600 hover:underline">
              Manage
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {lowStock.map((v) => (
              <li key={v.id} className="flex items-center justify-between">
                <span>{v.product?.name} -- {v.name}</span>
                <span className="font-medium text-red-600">{v.inventory} left</span>
              </li>
            ))}
            {lowStock.length === 0 && <p className="text-slate-500">All variants well stocked.</p>}
          </ul>
        </div>
      </section>

      <div className="mt-8">
        <Link href="/admin/products/new" className="btn-primary">+ New product</Link>
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value, href }) {
  return (
    <Link href={href} className="card block p-4 transition hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </Link>
  );
}
