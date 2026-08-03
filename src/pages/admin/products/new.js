import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout, { withAdmin } from '@/components/AdminLayout';
import { slugify } from '@/lib/format';

export const getServerSideProps = withAdmin();

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    product_type: 'physical',
    base_price_cents: '',
    digital_file_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  function onName(v) {
    setForm((f) => ({
      ...f,
      name: v,
      slug: f.slug ? f.slug : slugify(v),
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          base_price_cents: Math.round(Number(form.base_price_cents) * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.push(`/admin/products/${data.id}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout title="New product">
      <Link href="/admin/products" className="text-sm text-brand-600 hover:underline">
        &lt;- Products
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">New product</h1>

      <form onSubmit={submit} className="card mt-6 max-w-2xl space-y-4 p-4">
        <div>
          <label className="label">Name</label>
          <input className="input" required value={form.name} onChange={(e) => onName(e.target.value)} />
        </div>
        <div>
          <label className="label">Slug (URL)</label>
          <input
            className="input"
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
          />
          <p className="mt-1 text-xs text-slate-500">/products/{form.slug || 'your-slug'}</p>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[120px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Product type</label>
            <select
              className="input"
              value={form.product_type}
              onChange={(e) => setForm({ ...form, product_type: e.target.value })}
            >
              <option value="physical">Physical</option>
              <option value="digital">Digital download</option>
            </select>
          </div>
          <div>
            <label className="label">Base price (USD)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.base_price_cents}
              onChange={(e) => setForm({ ...form, base_price_cents: e.target.value })}
              onBlur={(e) => {
                const num = Number(e.target.value);
                if (e.target.value !== '' && !isNaN(num)) {
                  setForm((f) => ({ ...f, base_price_cents: num.toFixed(2) }));
                }
              }}
            />
          </div>
        </div>
        {form.product_type === 'digital' && (
          <div>
            <label className="label">Digital file URL (delivered after purchase)</label>
            <input
              className="input"
              value={form.digital_file_url}
              onChange={(e) => setForm({ ...form, digital_file_url: e.target.value })}
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-slate-500">
              For production, store this on Supabase Storage or S3 and generate signed URLs at fulfillment time.
            </p>
          </div>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create product'}
        </button>
        <p className="text-xs text-slate-500">
          After creating, you can add photos, variants, and inventory.
        </p>
      </form>
    </AdminLayout>
  );
}
