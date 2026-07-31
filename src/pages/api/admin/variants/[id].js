import { requireAdmin } from '@/lib/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabase';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const { inventory } = req.body || {};
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('product_variants')
    .update({ inventory: Math.max(0, Number(inventory) || 0) })
    .eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
