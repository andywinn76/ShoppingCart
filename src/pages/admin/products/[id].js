import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import AdminLayout, { withAdmin } from '@/components/AdminLayout';
import ImageUploader from '@/components/ImageUploader';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';

export const getServerSideProps = withAdmin(async (ctx) => {
  const supabase = getSupabaseAdmin();
  const { data: product } = await supabase
    .from('products')
    .select(
      'id, name, slug, description, base_price_cents, active, product_type, digital_file_url, category_id,' +
        ' product_images(id, url, public_id, alt, sort_order),' +
        ' product_variants(id, name, options, price_cents, inventory, active, sku, weight_grams)'
    )
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!product) return { notFound: true };
  product.product_images = (product.product_images || []).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name')
    .order('name');
  return { props: { product, categories: categories || [] } };
});

export default function EditProductPage({ product, categories }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product.name || '',
    slug: product.slug || '',
    description: product.description || '',
    base_price_cents: ((product.base_price_cents || 0) / 100).toString(),
    active: !!product.active,
    product_type: product.product_type,
    digital_file_url: product.digital_file_url || '',
    category_id: product.category_id || '',
  });
  const [images, setImages] = useState(product.product_images || []);
  const [variants, setVariants] = useState(
    product.product_variants && product.product_variants.length > 0
      ? product.product_variants
      : []
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [dragIdx, setDragIdx] = useState(null);

  async function saveDetails() {
    setBusy(true);
    setMsg('');
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        base_price_cents: Math.round(Number(form.base_price_cents) * 100),
        category_id: form.category_id || null,
      }),
    });
    setBusy(false);
    if (res.ok) setMsg('Saved.');
    else setMsg('Could not save.');
  }

  async function deleteProduct() {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/products');
  }

  async function addImage(img) {
    // Use setImages functional updater to get the latest length, because
    // multiple uploads can complete concurrently and a stale closure would
    // cause only the last image to appear.
    setImages((prev) => {
      const sortOrder = prev.length;
      fetch(`/api/admin/products/${product.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...img, sort_order: sortOrder }),
      })
        .then((res) => res.ok && res.json())
        .then((data) => {
          if (data?.image) {
            // Replace the optimistic placeholder (matched by url) with the
            // saved record that now has a real database id.
            setImages((cur) =>
              cur.map((i) => (i.url === img.url && !i.id ? data.image : i))
            );
          }
        });
      // Add an optimistic entry immediately so the thumbnail appears at once.
      return [...prev, { ...img, id: null, sort_order: sortOrder }];
    });
  }
  function moveImage(fromIdx, toIdx) {
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      const order = next.filter((img) => img.id).map((img) => img.id);
      fetch(`/api/admin/products/${product.id}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      return next;
    });
  }
  async function removeImage(id) {
    const res = await fetch(`/api/admin/products/${product.id}/images?id=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) setImages((prev) => prev.filter((i) => i.id !== id));
  }

  // ---- Variants -----------------------------------------------------------
  function addBlankVariant() {
    setVariants([
      ...variants,
      {
        id: null,
        name: '',
        options: {},
        price_cents: null,
        inventory: 0,
        active: true,
        sku: '',
      },
    ]);
  }
  function updateVariant(idx, patch) {
    setVariants(variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }
  async function saveVariants() {
    setBusy(true);
    const res = await fetch(`/api/admin/products/${product.id}/variants`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variants }),
    });
    setBusy(false);
    if (res.ok) {
      const { variants: saved } = await res.json();
      setVariants(saved);
      setMsg('Variants saved.');
    }
  }

  return (
    <AdminLayout title={product.name}>
      <div className="flex items-center justify-between">
        <Link href="/admin/products" className="text-sm text-brand-600 hover:underline">
          &lt;- Products
        </Link>
        <button onClick={deleteProduct} className="text-sm text-red-600 hover:underline">
          Delete product
        </button>
      </div>
      <h1 className="mt-2 text-2xl font-semibold">{product.name}</h1>
      {msg && <p className="mt-2 text-sm text-green-700">{msg}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Details */}
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Details</h2>
          <div className="space-y-3">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} />
            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-[120px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <Field
              label="Base price (USD)"
              value={form.base_price_cents}
              onChange={(v) => setForm({ ...form, base_price_cents: v })}
              onBlur={(v) => {
                const num = Number(v);
                if (v !== '' && !isNaN(num)) {
                  setForm((f) => ({ ...f, base_price_cents: num.toFixed(2) }));
                }
              }}
              type="number"
              step="0.01"
              min="0"
            />
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">-- None --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={form.product_type}
                onChange={(e) => setForm({ ...form, product_type: e.target.value })}
              >
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
              </select>
            </div>
            {form.product_type === 'digital' && (
              <Field
                label="Digital file URL"
                value={form.digital_file_url}
                onChange={(v) => setForm({ ...form, digital_file_url: v })}
              />
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active (visible in store)
            </label>
            <button className="btn-primary" onClick={saveDetails} disabled={busy}>
              {busy ? 'Saving...' : 'Save details'}
            </button>
          </div>
        </section>

        {/* Images */}
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Photos</h2>
            <ImageUploader onUpload={addImage}>+ Upload</ImageUploader>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Drag to reorder. The first photo is used as the thumbnail everywhere.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <div
                key={img.id ?? `pending-${idx}`}
                draggable={!!img.id}
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => {
                  if (dragIdx !== null) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIdx === null || dragIdx === idx) return;
                  moveImage(dragIdx, idx);
                  setDragIdx(null);
                }}
                onDragEnd={() => setDragIdx(null)}
                className={
                  'group relative aspect-square overflow-hidden rounded bg-slate-100' +
                  (img.id ? ' cursor-move' : '') +
                  (dragIdx === idx ? ' opacity-40' : '')
                }
              >
                <Image src={img.url} alt="" fill className="object-cover" />
                {idx === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Cover
                  </span>
                )}
                {img.id ? (
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute right-1 top-1 hidden rounded bg-white/80 px-2 py-0.5 text-xs text-red-600 group-hover:block"
                  >
                    Remove
                  </button>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-xs text-white">
                    Saving…
                  </div>
                )}
              </div>
            ))}
            {images.length === 0 && (
              <p className="col-span-3 text-sm text-slate-500">No photos yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Variants */}
      <section className="card mt-6 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Variants</h2>
          <button onClick={addBlankVariant} className="btn-outline">+ Add variant</button>
        </div>
        {form.product_type === 'digital' && (
          <p className="mt-1 text-xs text-slate-500">Digital products ignore inventory.</p>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr>
                <th className="pb-2">Name (e.g. &quot;M / Blue&quot;)</th>
                <th className="pb-2">SKU</th>
                <th className="pb-2">Price override (USD)</th>
                <th className="pb-2">Inventory</th>
                <th className="pb-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={v.id || i} className="border-t border-slate-100">
                  <td className="py-2 pr-2">
                    <input
                      className="input"
                      value={v.name}
                      onChange={(e) => updateVariant(i, { name: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className="input"
                      value={v.sku || ''}
                      onChange={(e) => updateVariant(i, { sku: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={v.price_cents == null ? '' : (v.price_cents / 100).toString()}
                      onChange={(e) =>
                        updateVariant(i, {
                          price_cents:
                            e.target.value === '' ? null : Math.round(Number(e.target.value) * 100),
                        })
                      }
                      placeholder={formatMoney(product.base_price_cents)}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className="input w-24"
                      type="number"
                      min={0}
                      value={v.inventory}
                      onChange={(e) => updateVariant(i, { inventory: Number(e.target.value) || 0 })}
                      disabled={form.product_type === 'digital'}
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={v.active}
                      onChange={(e) => updateVariant(i, { active: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
              {variants.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    Add at least one variant -- even single-SKU products need a &quot;default&quot; variant for checkout.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button className="btn-primary mt-4" onClick={saveVariants} disabled={busy}>
          {busy ? 'Saving...' : 'Save variants'}
        </button>
      </section>
    </AdminLayout>
  );
}

function Field({ label, value, onChange, onBlur, type = 'text', step, min }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
      />
    </div>
  );
}
