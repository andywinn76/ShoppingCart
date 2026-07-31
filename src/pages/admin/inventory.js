import { useState } from 'react';
import AdminLayout, { withAdmin } from '@/components/AdminLayout';
import { getSupabaseAdmin } from '@/lib/supabase';

export const getServerSideProps = withAdmin(async () => {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('product_variants')
    .select('id, name, sku, inventory, active, product:products(id, name, product_type, active)')
    .order('inventory', { ascending: true });
  // exclude digital products
  const variants = (data || []).filter(
    (v) => v.product && v.product.product_type !== 'digital' && v.product.active
  );
  return { props: { variants } };
});

export default function InventoryPage({ variants: initial }) {
  const [variants, setVariants] = useState(initial);
  const [savingId, setSavingId] = useState(null);

  async function save(id, inventory) {
    setSavingId(id);
    await fetch(`/api/admin/variants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory: Number(inventory) || 0 }),
    });
    setSavingId(null);
  }

  return (
    <AdminLayout title="Inventory">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <p className="mt-1 text-sm text-slate-600">
        Digital products are excluded. Lowest stock first.
      </p>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Variant</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Stock</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="border-b border-slate-100">
                <td className="p-3">{v.product?.name}</td>
                <td className="p-3">{v.name}</td>
                <td className="p-3 font-mono text-xs">{v.sku || '--'}</td>
                <td className="p-3">
                  <input
                    type="number"
                    min={0}
                    defaultValue={v.inventory}
                    onBlur={(e) => save(v.id, e.target.value)}
                    className="input w-24"
                  />
                </td>
                <td className="p-3 text-xs text-slate-500">
                  {savingId === v.id ? 'Saving...' : v.inventory < 5 ? 'Low' : ''}
                </td>
              </tr>
            ))}
            {variants.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No physical variants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
