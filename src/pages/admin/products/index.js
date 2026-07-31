import Link from 'next/link';
import Image from 'next/image';
import AdminLayout, { withAdmin } from '@/components/AdminLayout';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';

export const getServerSideProps = withAdmin(async () => {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('products')
    .select(
      'id, name, slug, base_price_cents, active, product_type, product_images(url, sort_order), product_variants(id, inventory)'
    )
    .order('created_at', { ascending: false });
  const products = (data || []).map((p) => ({
    ...p,
    product_images: (p.product_images || []).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    ),
    totalInventory: (p.product_variants || []).reduce(
      (sum, v) => sum + (v.inventory ?? 0),
      0
    ),
  }));
  return { props: { products } };
});

export default function AdminProducts({ products }) {
  return (
    <AdminLayout title="Products">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">+ New product</Link>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Type</th>
              <th className="p-3">Price</th>
              <th className="p-3">Inventory</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded bg-slate-100">
                      {p.product_images[0] && (
                        <Image src={p.product_images[0].url} alt="" fill className="object-cover" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 capitalize">{p.product_type}</td>
                <td className="p-3">{formatMoney(p.base_price_cents)}</td>
                <td className="p-3">
                  {p.product_type === 'digital' ? 'n/a' : p.totalInventory}
                </td>
                <td className="p-3">
                  <span className={p.active ? 'text-green-700' : 'text-slate-500'}>
                    {p.active ? 'Active' : 'Draft'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Link href={`/admin/products/${p.id}`} className="text-brand-600 hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No products yet. Click &quot;New product&quot; to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
