import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Layout from '@/components/Layout';
import { useCart } from '@/context/CartContext';
import { formatMoney } from '@/lib/format';
import { calculateShippingCents, getShippingRules } from '@/lib/shipping';

export default function CartPage() {
  const { lines, updateQuantity, removeItem, subtotalCents, hasPhysical, hydrated } = useCart();
  const [loading, setLoading] = useState(false);
  const { freeThresholdCents } = getShippingRules();

  // Note: we display a *preview* of shipping. Stripe Checkout will compute
  // the authoritative shipping + tax at checkout time.
  const previewShipping = calculateShippingCents(subtotalCents, hasPhysical);

  async function startCheckout() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <Layout title="Cart">
        <div className="mx-auto max-w-4xl px-4 py-12 text-slate-500">Loading cart...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Cart">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-semibold">Your cart</h1>

        {lines.length === 0 ? (
          <div className="mt-6 card p-8 text-center text-slate-500">
            Your cart is empty.{' '}
            <Link href="/products" className="text-brand-600 hover:underline">
              Start shopping
            </Link>
            .
          </div>
        ) : (
          <div className="mt-6 grid gap-8 md:grid-cols-3">
            <ul className="md:col-span-2 space-y-3">
              {lines.map((l) => (
                <li key={l.variant_id} className="card flex gap-3 p-3">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-slate-100">
                    {l.image ? (
                      <Image src={l.image} alt={l.product_name} fill className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-medium">{l.product_name}</p>
                        {l.variant_name && (
                          <p className="text-sm text-slate-500">{l.variant_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(l.variant_id)}
                        className="text-sm text-slate-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <input
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) =>
                          updateQuantity(l.variant_id, Math.max(1, Number(e.target.value) || 1))
                        }
                        className="input w-20"
                      />
                      <p className="font-medium">
                        {formatMoney(l.unit_price_cents * l.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="card h-fit p-4">
              <h2 className="text-lg font-semibold">Order summary</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(subtotalCents)}</dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>Shipping (est.)</dt>
                  <dd>
                    {hasPhysical
                      ? previewShipping === 0
                        ? 'Free'
                        : formatMoney(previewShipping)
                      : 'Digital -- free'}
                  </dd>
                </div>
                <div className="flex justify-between text-slate-600">
                  <dt>Tax</dt>
                  <dd>Calculated at checkout</dd>
                </div>
                {hasPhysical && subtotalCents < freeThresholdCents && (
                  <p className="text-xs text-slate-500">
                    Spend {formatMoney(freeThresholdCents - subtotalCents)} more for free shipping.
                  </p>
                )}
              </dl>
              <button
                onClick={startCheckout}
                disabled={loading}
                className="btn-primary mt-4 w-full disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Checkout'}
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                Guest checkout supported. Sign in to save your order history.
              </p>
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}
