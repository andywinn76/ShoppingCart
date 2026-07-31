// Creates a Stripe Checkout Session.
//
// Important: we re-fetch each variant from the database and use the *server*
// price. The client-supplied unit_price is ignored. This prevents tampering.
//
// We also create a pending `orders` row up front so the webhook can mark it
// paid later. Inventory is decremented in the webhook (post-payment) to avoid
// reserving stock for abandoned carts.

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { calculateShippingCents } from '@/lib/shipping';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    const supabase = getSupabaseAdmin();
    const variantIds = items.map((i) => i.variant_id);
    const { data: variants, error: vErr } = await supabase
      .from('product_variants')
      .select(
        'id, name, options, price_cents, inventory, active, product:products(id, name, product_type, base_price_cents, currency, active, digital_file_url)'
      )
      .in('id', variantIds);
    if (vErr) throw vErr;

    if (!variants || variants.length !== variantIds.length) {
      return res.status(400).json({ error: 'One or more cart items are unavailable' });
    }

    let subtotal = 0;
    let hasPhysical = false;
    const lineItems = [];
    const orderItemsRows = [];

    for (const item of items) {
      const v = variants.find((x) => x.id === item.variant_id);
      if (!v || !v.active || !v.product?.active) {
        return res.status(400).json({ error: 'A product is no longer available' });
      }
      const qty = Math.max(1, Number(item.quantity) || 1);
      if (v.product.product_type !== 'digital' && v.inventory < qty) {
        return res
          .status(400)
          .json({ error: `Only ${v.inventory} of ${v.product.name} available` });
      }
      if (v.product.product_type !== 'digital') hasPhysical = true;

      const unit = v.price_cents ?? v.product.base_price_cents;
      subtotal += unit * qty;

      lineItems.push({
        price_data: {
          currency: v.product.currency || 'usd',
          product_data: {
            name: `${v.product.name}${v.name && v.name !== 'default' ? ` -- ${v.name}` : ''}`,
            metadata: { variant_id: v.id, product_id: v.product.id },
          },
          unit_amount: unit,
          tax_behavior: 'exclusive',
        },
        quantity: qty,
      });
      orderItemsRows.push({
        variant_id: v.id,
        product_id: v.product.id,
        product_name: v.product.name,
        variant_name: v.name,
        unit_price_cents: unit,
        quantity: qty,
        line_total_cents: unit * qty,
      });
    }

    const shipping = calculateShippingCents(subtotal, hasPhysical);
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

    // Insert pending order so we have a stable record before payment.
    let profileId = null;
    if (session?.user?.email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', session.user.email.toLowerCase())
        .maybeSingle();
      profileId = profile?.id || null;
    }

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        profile_id: profileId,
        email: session?.user?.email?.toLowerCase() || 'guest@pending',
        status: 'pending',
        subtotal_cents: subtotal,
        shipping_cents: shipping,
        total_cents: subtotal + shipping, // tax added by Stripe
      })
      .select('id')
      .single();
    if (oErr) throw oErr;

    const orderItems = orderItemsRows.map((r) => ({ ...r, order_id: order.id }));
    await supabase.from('order_items').insert(orderItems);

    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      automatic_tax: { enabled: true },
      // Stripe collects customer email if not signed in. Pass it if we have it.
      customer_email: session?.user?.email || undefined,
      shipping_address_collection: hasPhysical
        ? { allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ', 'IE'] }
        : undefined,
      billing_address_collection: 'required',
      shipping_options: hasPhysical
        ? [
            {
              shipping_rate_data: {
                display_name: shipping === 0 ? 'Free shipping' : 'Standard shipping',
                type: 'fixed_amount',
                fixed_amount: { amount: shipping, currency: 'usd' },
              },
            },
          ]
        : undefined,
      // Allow promo codes
      allow_promotion_codes: true,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      metadata: { order_id: order.id },
    });

    // Save the Stripe session id so the webhook can find it.
    await supabase
      .from('orders')
      .update({ stripe_session_id: stripeSession.id })
      .eq('id', order.id);

    return res.status(200).json({ url: stripeSession.url });
  } catch (err) {
    console.error('[checkout/session]', err);
    return res.status(500).json({ error: err.message || 'Checkout failed' });
  }
}
