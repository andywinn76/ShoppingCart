import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useCart } from '@/context/CartContext';

export default function CheckoutSuccess() {
  const { clear } = useCart();
  const router = useRouter();
  const sessionId = router.query.session_id;

  // Clear cart on success.
  useEffect(() => {
    clear();
  }, [clear]);

  return (
    <Layout title="Thanks for your order!">
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">Thank you!</h1>
        <p className="mt-3 text-slate-600">
          Your payment was successful. You will receive an email confirmation shortly.
        </p>
        {sessionId && (
          <p className="mt-2 text-xs text-slate-400">Stripe session: {sessionId}</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/products" className="btn-primary">Keep shopping</Link>
          <Link href="/account/orders" className="btn-outline">View my orders</Link>
        </div>
      </div>
    </Layout>
  );
}
