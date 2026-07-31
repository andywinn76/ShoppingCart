// Bulk upsert variants for a single product. Existing variants without an
// id stay as inserts; ones with ids are updated. Variants in the DB that
// aren't in the request are deleted (so admins can remove rows by submitting
// a shorter list).

import { requireAdmin } from '@/lib/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabase';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const { id: productId } = req.query;
  const { variants } = req.body || {};
  if (!Array.isArray(variants)) {
    return res.status(400).json({ error: 'variants[] required' });
  }
  const supabase = getSupabaseAdmin();

  // Fetch existing IDs so we can delete the ones the user removed.
  const { data: existing } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  const existingIds = new Set((existing || []).map((v) => v.id));
  const submittedIds = new Set(variants.filter((v) => v.id).map((v) => v.id));
  const toDelete = [...existingIds].filter((eid) => !submittedIds.has(eid));
  if (toDelete.length) {
    await supabase.from('product_variants').delete().in('id', toDelete);
  }

  const upserts = [];
  for (const v of variants) {
    const row = {
      product_id: productId,
      name: v.name || 'default',
      options: v.options || {},
      price_cents: v.price_cents ?? null,
      inventory: Number(v.inventory) || 0,
      active: v.active !== false,
      sku: v.sku || null,
      weight_grams: v.weight_grams ?? null,
    };
    if (v.id) row.id = v.id;
    upserts.push(row);
  }

  const { data: saved, error } = await supabase
    .from('product_variants')
    .upsert(upserts, { onConflict: 'id' })
    .select('*');
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ variants: saved });
}
