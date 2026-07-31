// Pure functions for shipping calculation. Rates come from env vars so the
// admin can tweak them without code changes.

export function getShippingRules() {
  return {
    flatRateCents: Number(process.env.SHIPPING_FLAT_RATE_CENTS ?? 700),
    freeThresholdCents: Number(process.env.SHIPPING_FREE_THRESHOLD_CENTS ?? 5000),
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
