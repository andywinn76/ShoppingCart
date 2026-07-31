// Stripe webhook. Marks orders as paid, decrements inventory, sends email.
//
// IMPORTANT: This route disables Next's default body parser so we can verify
// Stripe's signature against the *raw* request body.

import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendOrderConfirmation } from '@/lib/resend';

export const config = {
  api: { bodyParser: false },
};

// Read the raw request body (Stripe signature verification requires it).
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).end('Webhook secret not configured');
  }

  let event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).end(`Webhook Error: ${err.message}`);
  }

  try {
    const supabase = getSupabaseAdmin();
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        const orderId = s.metadata?.order_id;
        if (!orderId) {
          console.warn('[webhook] checkout.session.completed without order_id');
          break;
        }

        // Recompute totals from Stripe's authoritative values.
        const tax = s.total_details?.amount_tax ?? 0;
        const shipping = s.total_details?.amount_shipping ?? 0;
        const subtotal = (s.amount_subtotal ?? 0);
        const total = s.amount_total ?? subtotal + shipping + tax;

        await supabase
          .from('orders')
          .update({
            status: 'paid',
            email: s.customer_details?.email || s.customer_email || 'guest@unknown',
            stripe_payment_intent_id: s.payment_intent,
            tax_cents: tax,
            shipping_cents: shipping,
            subtotal_cents: subtotal,
            total_cents: total,
            shipping_address: s.shipping_details
              ? {
                  name: s.shipping_details.name,
                  ...s.shipping_details.address,
                }
              : null,
            billing_address: s.customer_details?.address
              ? { name: s.customer_details.name, ...s.customer_details.address }
              : null,
            paid_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        // Decrement inventory for physical items.
        const { data: items } = await supabase
          .from('order_items')
          .select('variant_id, quantity, product:products(product_type)')
          .eq('order_id', orderId);
        for (const it of items || []) {
          if (it.product?.product_type === 'digital' || !it.variant_id) continue;
          // Atomic decrement via RPC would be safer; for v1 we read-then-write.
          const { data: variant } = await supabase
            .from('product_variants')
            .select('inventory')
            .eq('id', it.variant_id)
            .maybeSingle();
          if (variant) {
            await supabase
              .from('product_variants')
              .update({ inventory: Math.max(0, variant.inventory - it.quantity) })
              .eq('id', it.variant_id);
          }
        }

        // Email confirmation.
        const { data: order } = await supabase
          .from('orders')
          .select('id, subtotal_cents, shipping_cents, tax_cents, total_cents')
          .eq('id', orderId)
          .maybeSingle();
        const { data: emailItems } = await supabase
          .from('order_items')
          .select('product_name, variant_name, quantity, line_total_cents')
          .eq('order_id', orderId);
        if (order && (s.customer_details?.email || s.customer_email)) {
          await sendOrderConfirmation({
            to: s.customer_details?.email || s.customer_email,
            order,
            items: emailItems || [],
          });
        }
        break;
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const s = event.data.object;
        const orderId = s.metadata?.order_id;
        if (orderId) {
          await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
        }
        break;
      }
      default:
        // ignore other events
        break;
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] handler error', err);
    return res.status(500).end('Webhook handler failed');
  }
}
