import Link from 'next/link';
import Layout from '@/components/Layout';

export default function CheckoutCancel() {
  return (
    <Layout title="Checkout cancelled">
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">Checkout cancelled</h1>
        <p className="mt-3 text-slate-600">No charge was made. Your cart is still saved.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/cart" className="btn-primary">Back to cart</Link>
          <Link href="/products" className="btn-outline">Keep shopping</Link>
        </div>
      </div>
    </Layout>
  );
}
