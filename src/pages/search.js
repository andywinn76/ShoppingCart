import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function getServerSideProps({ query }) {
  const q = (query.q || '').trim();
  if (!q) return { props: { q, products: [] } };

  let products = [];
  try {
    const supabase = getSupabaseAdmin();
    // Try full-text first, fall back to ilike on name.
    const { data: tsv } = await supabase
      .from('products')
      .select(
        'id, slug, name, base_price_cents, product_images(url, alt, sort_order)'
      )
      .textSearch('search_tsv', q.split(' ').filter(Boolean).join(' & '))
      .eq('active', true)
      .limit(40);

    if (tsv && tsv.length) {
      products = tsv;
    } else {
      const { data } = await supabase
        .from('products')
        .select(
          'id, slug, name, base_price_cents, product_images(url, alt, sort_order)'
        )
        .ilike('name', `%${q}%`)
        .eq('active', true)
        .limit(40);
      products = data || [];
    }
    products = products.map((p) => ({
      ...p,
      product_images: (p.product_images || []).sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      ),
    }));
  } catch (_) {}

  return { props: { q, products } };
}

export default function SearchPage({ q, products }) {
  return (
    <Layout title={`Search: ${q}`}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Search results for &quot;{q}&quot;</h1>
        {!q && <p className="mt-2 text-slate-500">Try searching from the header.</p>}
        {q && products.length === 0 && (
          <p className="mt-2 text-slate-500">No products matched your search.</p>
        )}
        {products.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
