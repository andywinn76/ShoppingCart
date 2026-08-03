// Pure functions for shipping calculation. Rates come from env vars so the
// admin can tweak them without code changes.
//
// NEXT_PUBLIC_ prefix is required here: getShippingRules() is called both
// server-side (checkout/session.js) and client-side (cart.js, for the
// pre-checkout preview). Next.js only inlines NEXT_PUBLIC_ vars into the
// browser bundle -- without the prefix the client preview would silently
// fall back to the defaults below instead of the configured rate.

export function getShippingRules() {
  return {
    flatRateCents: Number(process.env.NEXT_PUBLIC_SHIPPING_FLAT_RATE_CENTS ?? 700),
    freeThresholdCents: Number(process.env.NEXT_PUBLIC_SHIPPING_FREE_THRESHOLD_CENTS ?? 5000),
  };
}

// Returns shipping cost in cents for a given subtotal (in cents) and whether
// the cart contains any physical items. Digital-only carts ship for free.
export function calculateShippingCents(subtotalCents, hasPhysical) {
  if (!hasPhysical) return 0;
  const { flatRateCents, freeThresholdCents } = getShippingRules();
  if (subtotalCents >= freeThresholdCents) return 0;
  return flatRateCents;
}
