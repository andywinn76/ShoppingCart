import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function getServerSideProps() {
  let products = [];
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('products')
      .select('id, slug, name, base_price_cents, product_images(url, alt, sort_order)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(8);
    products = (data || []).map((p) => ({
      ...p,
      product_images: (p.product_images || []).sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      ),
    }));
  } catch (_) {
    // Supabase not configured yet -- render empty state.
  }
  return { props: { products } };
}

export default function Home({ products }) {
  const { data: session } = useSession();
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Shop';
  const tagline = process.env.NEXT_PUBLIC_STORE_TAGLINE || 'Curated goods, delivered.';
  const displayName = session?.user?.name || session?.user?.email;
  return (
    <Layout>
      <section className="bg-gradient-to-br from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {displayName ? `Welcome, ${displayName}!` : `Welcome to ${storeName}`}
          </h1>
          <p className="mt-3 text-lg text-slate-600">{tagline}</p>
          <div className="mt-6">
            <Link href="/products" className="btn-primary">Shop the catalog</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">New arrivals</h2>
          <Link href="/products" className="text-sm font-medium text-brand-600 hover:underline">
            View all -&gt;
          </Link>
        </div>
        {products.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">
            No products yet. Once you sign in as admin, head to{' '}
            <Link href="/admin/products/new" className="text-brand-600 hover:underline">
              Admin -&gt; New Product
            </Link>{' '}
            to add your first one.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
