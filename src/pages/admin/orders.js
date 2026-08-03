import { useState } from 'react';
import Link from 'next/link';
import AdminLayout, { withAdmin } from '@/components/AdminLayout';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';
import { ALLOWED_TRANSITIONS } from '@/lib/orderStatus';

export const getServerSideProps = withAdmin(async () => {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('orders')
    .select(
      'id, status, email, subtotal_cents, shipping_cents, tax_cents, total_cents, currency, created_at, paid_at, order_items(product_name, variant_name, quantity)'
    )
    .order('created_at', { ascending: false })
    .limit(100);
  return { props: { orders: data || [] } };
});

export default function AdminOrders({ orders: initial }) {
  const [orders, setOrders] = useState(initial);
  const [pending, setPending] = useState(null); // order being confirmed for delete
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [statusBusyId, setStatusBusyId] = useState(null);
  const [statusError, setStatusError] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');

  async function changeStatus(order, status) {
    setStatusBusyId(order.id);
    setStatusError((prev) => ({ ...prev, [order.id]: '' }));
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setStatusBusyId(null);
    if (res.ok) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
      return;
    }
    const data = await res.json().catch(() => ({}));
    setStatusError((prev) => ({ ...prev, [order.id]: data.error || 'Could not update status.' }));
  }

  async function confirmDelete(force) {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/orders/${pending.id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
    });
    setBusy(false);
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o.id !== pending.id));
      setPending(null);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.requiresForce) {
      setPending((p) => ({ ...p, needsForce: true }));
    } else {
      setError(data.error || 'Could not delete order.');
    }
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === orders.length ? new Set() : new Set(orders.map((o) => o.id))));
  }

  async function bulkChangeStatus(status) {
    const targets = orders.filter(
      (o) => selected.has(o.id) && ALLOWED_TRANSITIONS[o.status]?.includes(status)
    );
    const skipped = selected.size - targets.length;
    if (targets.length === 0) {
      setBulkMessage(`No selected orders can move to "${status}" from their current status.`);
      return;
    }
    setBulkBusy(true);
    setBulkMessage('');
    const results = await Promise.all(
      targets.map((o) =>
        fetch(`/api/admin/orders/${o.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }).then((res) => ({ id: o.id, ok: res.ok }))
      )
    );
    setBulkBusy(false);
    const succeededIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
    setOrders((prev) =>
      prev.map((o) => (succeededIds.has(o.id) ? { ...o, status } : o))
    );
    setSelected(new Set());
    const failed = targets.length - succeededIds.size;
    setBulkMessage(
      `Updated ${succeededIds.size} order${succeededIds.size === 1 ? '' : 's'} to "${status}".` +
        (skipped > 0 ? ` ${skipped} skipped (invalid transition for their status).` : '') +
        (failed > 0 ? ` ${failed} failed.` : '')
    );
  }

  async function bulkDelete() {
    const targets = orders.filter(
      (o) => selected.has(o.id) && ['pending', 'cancelled'].includes(o.status)
    );
    const skipped = selected.size - targets.length;
    if (targets.length === 0) {
      setBulkMessage('Selected orders are not pending/cancelled -- delete those individually to confirm.');
      return;
    }
    if (!confirm(`Delete ${targets.length} order${targets.length === 1 ? '' : 's'}? This cannot be undone.`)) {
      return;
    }
    setBulkBusy(true);
    setBulkMessage('');
    const results = await Promise.all(
      targets.map((o) =>
        fetch(`/api/admin/orders/${o.id}`, { method: 'DELETE' }).then((res) => ({ id: o.id, ok: res.ok }))
      )
    );
    setBulkBusy(false);
    const deletedIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
    setOrders((prev) => prev.filter((o) => !deletedIds.has(o.id)));
    setSelected(new Set());
    const failed = targets.length - deletedIds.size;
    setBulkMessage(
      `Deleted ${deletedIds.size} order${deletedIds.size === 1 ? '' : 's'}.` +
        (skipped > 0 ? ` ${skipped} skipped (not pending/cancelled -- delete individually to confirm).` : '') +
        (failed > 0 ? ` ${failed} failed.` : '')
    );
  }

  function exportCsv() {
    const header = [
      'Order ID',
      'Email',
      'Status',
      'Items',
      'Subtotal',
      'Shipping',
      'Tax',
      'Total',
      'Currency',
      'Created At',
      'Paid At',
    ];
    const rows = orders.map((o) => [
      o.id,
      o.email,
      o.status,
      o.order_items
        .map((i) => `${i.quantity}x ${i.product_name}${i.variant_name ? ` -- ${i.variant_name}` : ''}`)
        .join('; '),
      (o.subtotal_cents / 100).toFixed(2),
      (o.shipping_cents / 100).toFixed(2),
      (o.tax_cents / 100).toFixed(2),
      (o.total_cents / 100).toFixed(2),
      (o.currency || 'usd').toUpperCase(),
      new Date(o.created_at).toISOString(),
      o.paid_at ? new Date(o.paid_at).toISOString() : '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvField).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminLayout title="Orders">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <button className="btn-outline" onClick={exportCsv} disabled={orders.length === 0}>
          Export CSV
        </button>
      </div>

      {selected.size > 0 && (
        <div className="card mt-4 flex flex-wrap items-center gap-3 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button
            className="btn-outline text-sm"
            onClick={() => bulkChangeStatus('fulfilled')}
            disabled={bulkBusy}
          >
            Mark fulfilled
          </button>
          <button
            className="btn-outline text-sm"
            onClick={() => bulkChangeStatus('cancelled')}
            disabled={bulkBusy}
          >
            Cancel orders
          </button>
          <button
            className="btn-outline border-red-300 text-sm text-red-600 hover:bg-red-50"
            onClick={bulkDelete}
            disabled={bulkBusy}
          >
            Delete selected
          </button>
          <button className="text-sm text-slate-500 hover:underline" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
          {bulkBusy && <span className="text-xs text-slate-500">Working...</span>}
        </div>
      )}
      {bulkMessage && <p className="mt-2 text-sm text-slate-600">{bulkMessage}</p>}

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={orders.length > 0 && selected.size === orders.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Items</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-slate-100 align-top">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggleSelected(o.id)}
                  />
                </td>
                <td className="p-3 font-mono text-xs">
                  <Link href={`/admin/orders/${o.id}`} className="text-brand-600 hover:underline">
                    #{o.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="p-3">{o.email}</td>
                <td className="p-3 text-xs">
                  {o.order_items.map((i, idx) => (
                    <div key={idx}>
                      {i.quantity} x {i.product_name}
                      {i.variant_name ? ` -- ${i.variant_name}` : ''}
                    </div>
                  ))}
                </td>
                <td className="p-3">{formatMoney(o.total_cents)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={o.status} />
                    {ALLOWED_TRANSITIONS[o.status]?.length > 0 && (
                      <select
                        className="input w-auto py-1 text-xs"
                        value=""
                        disabled={statusBusyId === o.id}
                        onChange={(e) => e.target.value && changeStatus(o, e.target.value)}
                      >
                        <option value="">
                          {statusBusyId === o.id ? 'Saving...' : 'Change to...'}
                        </option>
                        {ALLOWED_TRANSITIONS[o.status].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {statusError[o.id] && (
                    <p className="mt-1 text-xs text-red-600">{statusError[o.id]}</p>
                  )}
                </td>
                <td className="p-3 text-xs text-slate-500">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => {
                      setError('');
                      setPending({ id: o.id, status: o.status, needsForce: false });
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-5">
            {!pending.needsForce ? (
              <>
                <h2 className="text-lg font-semibold">Delete order?</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Order #{pending.id.slice(0, 8)} ({pending.status}) will be permanently removed.
                  This cannot be undone.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-red-700">Are you sure?</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Order #{pending.id.slice(0, 8)} is <strong>{pending.status}</strong>, not
                  pending/cancelled. Deleting it removes a record of a completed transaction.
                  Confirm again to proceed anyway.
                </p>
              </>
            )}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="btn-outline"
                onClick={() => setPending(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="btn-primary bg-red-600 hover:bg-red-700"
                onClick={() => confirmDelete(pending.needsForce)}
                disabled={busy}
              >
                {busy ? 'Deleting...' : pending.needsForce ? 'Delete anyway' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function csvField(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    fulfilled: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-slate-200 text-slate-700',
    refunded: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status] || 'bg-slate-100'}`}>
      {status}
    </span>
  );
}
