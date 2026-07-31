import { requireAdmin } from '@/lib/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabase';
import { slugify } from '@/lib/format';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const { id } = req.query;
  const supabase = getSupabaseAdmin();

  if (req.method === 'PUT') {
    const b = req.body || {};
    const patch = {
      name: b.name,
      slug: b.slug ? slugify(b.slug) : undefined,
      description: b.description ?? null,
      base_price_cents: Number(b.base_price_cents) || 0,
      active: !!b.active,
      product_type: b.product_type,
      digital_file_url: b.digital_file_url ?? null,
      category_id: b.category_id ?? null,
    };
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
