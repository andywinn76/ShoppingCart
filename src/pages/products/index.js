import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function getServerSideProps({ query }) {
  const category = query.category || null;
  let products = [];
  let categories = [];
  try {
    const supabase = getSupabaseAdmin();
    const [{ data: cats }, productsRes] = await Promise.all([
      supabase.from('categories').select('id, slug, name').order('name'),
      (async () => {
        let q = supabase
          .from('products')
          .select(
            'id, slug, name, base_price_cents, category:categories(slug,name), product_images(url, alt, sort_order)'
          )
          .eq('active', true)
          .order('created_at', { ascending: false });
        if (category) {
          // filter by category slug via inner-join trick: fetch ids first
          const { data: catRow } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', category)
            .maybeSingle();
          if (catRow?.id) q = q.eq('category_id', catRow.id);
          else q = q.eq('category_id', '00000000-0000-0000-0000-000000000000');
        }
        return await q;
      })(),
    ]);
    categories = cats || [];
    products = (productsRes.data || []).map((p) => ({
      ...p,
      product_images: (p.product_images || []).sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      ),
    }));
  } catch (_) {}
  return { props: { products, categories, currentCategory: category } };
}

export default function ProductsPage({ products, categories, currentCategory }) {
  return (
    <Layout title="Shop">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold">Shop</h1>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/products"
            className={
              !currentCategory
                ? 'rounded-full bg-brand-600 px-3 py-1 text-sm text-white'
                : 'rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200'
            }
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className={
                currentCategory === c.slug
                  ? 'rounded-full bg-brand-600 px-3 py-1 text-sm text-white'
                  : 'rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200'
              }
            >
              {c.name}
            </Link>
          ))}
        </div>

        {products.length === 0 ? (
          <p className="mt-8 text-slate-500">No products in this category yet.</p>
        ) : (
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
