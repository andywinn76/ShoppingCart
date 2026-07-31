// Server-only Stripe client. Never import this from a component that renders
// on the client; the secret key would be bundled in.

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[stripe] STRIPE_SECRET_KEY is not set.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_missing', {
  apiVersion: '2024-06-20',
  appInfo: { name: 'My Shop', version: '0.1.0' },
});
