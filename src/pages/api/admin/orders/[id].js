import { requireAdmin } from '@/lib/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ALLOWED_TRANSITIONS } from '@/lib/orderStatus';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const { id } = req.query;
  const supabase = getSupabaseAdmin();

  if (req.method === 'PATCH') {
    const { status } = req.body || {};
    if (!Object.keys(ALLOWED_TRANSITIONS).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, paid_at')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!ALLOWED_TRANSITIONS[order.status]?.includes(status)) {
      return res.status(409).json({
        error: `Cannot change status from "${order.status}" to "${status}".`,
      });
    }

    const patch = { status };
    if (status === 'paid' && !order.paid_at) patch.paid_at = new Date().toISOString();
    if (status === 'fulfilled') patch.fulfilled_at = new Date().toISOString();

    const { error } = await supabase.from('orders').update(patch).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    console.log(
      `[admin] order ${id} status changed ${order.status} -> ${status} by ${session.user.email} at ${new Date().toISOString()}`
    );

    return res.status(200).json({ ok: true, status });
  }

  if (req.method === 'DELETE') {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!['pending', 'cancelled'].includes(order.status) && req.query.force !== 'true') {
      return res.status(409).json({
        error: `Order status is "${order.status}". Pass force=true to delete anyway.`,
        requiresForce: true,
      });
    }

    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    console.log(
      `[admin] order ${id} (status: ${order.status}) deleted by ${session.user.email} at ${new Date().toISOString()}`
    );

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
