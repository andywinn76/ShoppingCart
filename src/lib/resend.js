// Server-only Resend client for transactional email.
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'orders@example.com';

export async function sendOrderConfirmation({ to, order, items }) {
  if (!resend) {
    console.warn('[resend] RESEND_API_KEY not set; skipping email send.');
    return;
  }
  const lines = items
    .map(
      (i) =>
        `${i.quantity} x ${i.product_name}${i.variant_name ? ' -- ' + i.variant_name : ''}  $${(
          i.line_total_cents / 100
        ).toFixed(2)}`
    )
    .join('\n');
  const subject = `Order confirmation #${order.id.slice(0, 8)}`;
  const text =
    `Thanks for your order!\n\n` +
    `${lines}\n\n` +
    `Subtotal: $${(order.subtotal_cents / 100).toFixed(2)}\n` +
    `Shipping: $${(order.shipping_cents / 100).toFixed(2)}\n` +
    `Tax: $${(order.tax_cents / 100).toFixed(2)}\n` +
    `Total: $${(order.total_cents / 100).toFixed(2)}\n`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, text });
  } catch (err) {
    console.error('[resend] send failed', err);
  }
}
