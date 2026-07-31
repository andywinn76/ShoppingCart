import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import SocialShare from '@/components/SocialShare';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';
import { useCart } from '@/context/CartContext';

export async function getServerSideProps({ params }) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: product } = await supabase
      .from('products')
      .select(
        'id, slug, name, description, base_price_cents, product_type, active,' +
          ' product_images(id, url, alt, sort_order),' +
          ' product_variants(id, name, options, price_cents, inventory, active)'
      )
      .eq('slug', params.slug)
      .eq('active', true)
      .maybeSingle();

    if (!product) return { notFound: true };

    product.product_images = (product.product_images || []).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    product.product_variants = (product.product_variants || []).filter((v) => v.active);

    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating, title, body, created_at, profiles(name)')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return { props: { product, reviews: reviews || [] } };
  } catch (_) {
    return { notFound: true };
  }
}

export default function ProductPage({ product, reviews }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(product.product_variants[0]?.id || null);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const selectedVariant =
    product.product_variants.find((v) => v.id === variantId) || product.product_variants[0];
  const unitPrice = selectedVariant?.price_cents ?? product.base_price_cents;
  const outOfStock =
    product.product_type !== 'digital' && (selectedVariant?.inventory ?? 0) <= 0;

  const siteUrl =
    (typeof window !== 'undefined' && window.location.origin) ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    '';
  const productUrl = `${siteUrl}/products/${product.slug}`;

  function handleAdd() {
    if (!selectedVariant) return;
    addItem({
      variant_id: selectedVariant.id,
      product_id: product.id,
      product_name: product.name,
      variant_name: selectedVariant.name,
      unit_price_cents: unitPrice,
      quantity: qty,
      product_type: product.product_type,
      image: product.product_images[0]?.url || null,
    });
    router.push('/cart');
  }

  return (
    <Layout title={product.name} description={product.description}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100">
            {product.product_images[activeImage] ? (
              <Image
                src={product.product_images[activeImage].url}
                alt={product.product_images[activeImage].alt || product.name}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                No image
              </div>
            )}
          </div>
          {product.product_images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.product_images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border ${
                    i === activeImage ? 'border-brand-600' : 'border-slate-200'
                  }`}
                  aria-label={`Image ${i + 1}`}
                >
                  <Image src={img.url} alt={img.alt || ''} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{product.name}</h1>
          <p className="mt-2 text-2xl font-medium">{formatMoney(unitPrice)}</p>
          {product.product_type === 'digital' && (
            <p className="mt-1 inline-block rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
              Digital download
            </p>
          )}

          {product.description && (
            <p className="mt-4 whitespace-pre-line text-slate-700">{product.description}</p>
          )}

          {product.product_variants.length > 1 && (
            <div className="mt-6">
              <label className="label">Choose variant</label>
              <select
                className="input"
                value={variantId || ''}
                onChange={(e) => setVariantId(e.target.value)}
              >
                {product.product_variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.price_cents != null && v.price_cents !== product.base_price_cents
                      ? ` -- ${formatMoney(v.price_cents)}`
                      : ''}
                    {product.product_type !== 'digital' && v.inventory <= 0 ? ' (out of stock)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <label className="label !mb-0" htmlFor="qty">Qty</label>
            <input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="input w-20"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={outOfStock || !selectedVariant}
            className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {outOfStock ? 'Out of stock' : 'Add to cart'}
          </button>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <SocialShare
              url={productUrl}
              title={product.name}
              image={product.product_images[0]?.url}
            />
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="text-xl font-semibold">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-slate-500">No reviews yet.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {reviews.map((r, i) => (
              <li key={i} className="card p-4">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">{'*'.repeat(r.rating)}</span>
                  <span className="text-sm font-medium text-slate-700">
                    {r.profiles?.name || 'Customer'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.title && <p className="mt-1 font-medium">{r.title}</p>}
                {r.body && <p className="mt-1 text-slate-700">{r.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  );
}
