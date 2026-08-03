// Server-only Resend client for transactional email.
import { Resend } from 'resend';
import { formatMoney } from '@/lib/format';

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'orders@example.com';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml({ order, items, currency }) {
  const rows = items
    .map((i) => {
      const name =
        escapeHtml(i.product_name) + (i.variant_name ? ` -- ${escapeHtml(i.variant_name)}` : '');
      const thumb = i.thumbnail_url
        ? `<img src="${escapeHtml(i.thumbnail_url)}" width="56" height="56" alt="" style="display:block;border-radius:6px;object-fit:cover;background:#f1f5f9;" />`
        : `<div style="width:56px;height:56px;border-radius:6px;background:#f1f5f9;"></div>`;
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;width:56px;">${thumb}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;">
            ${name}<br/><span style="color:#64748b;font-size:12px;">Qty ${i.quantity} &times; ${formatMoney(i.unit_price_cents, currency)}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;text-align:right;white-space:nowrap;">
            ${formatMoney(i.line_total_cents, currency)}
          </td>
        </tr>`;
    })
    .join('');

  const summaryRow = (label, cents) => `
    <tr>
      <td colspan="2" style="padding:4px 0;font-size:13px;color:#64748b;text-align:right;">${label}</td>
      <td style="padding:4px 0;font-size:13px;color:#0f172a;text-align:right;white-space:nowrap;">${formatMoney(cents, currency)}</td>
    </tr>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px 16px;color:#0f172a;">
    <h1 style="font-size:20px;margin:0 0 4px;">Thanks for your order!</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Order #${order.id.slice(0, 8)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${rows}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      ${summaryRow('Subtotal', order.subtotal_cents)}
      ${summaryRow('Shipping', order.shipping_cents)}
      ${summaryRow('Tax', order.tax_cents)}
      <tr>
        <td colspan="2" style="padding:8px 0 0;font-size:14px;font-weight:bold;text-align:right;border-top:1px solid #e2e8f0;">Total</td>
        <td style="padding:8px 0 0;font-size:14px;font-weight:bold;text-align:right;white-space:nowrap;border-top:1px solid #e2e8f0;">${formatMoney(order.total_cents, currency)}</td>
      </tr>
    </table>
  </div>`;
}

export async function sendOrderConfirmation({ to, order, items }) {
  if (!resend) {
    console.warn('[resend] RESEND_API_KEY not set; skipping email send.');
    return;
  }
  const currency = order.currency?.toUpperCase() || 'USD';
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
  const html = buildHtml({ order, items, currency });

  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, text, html });
  } catch (err) {
    console.error('[resend] send failed', err);
  }
}
