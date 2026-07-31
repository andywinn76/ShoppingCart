import { requireAdmin } from '@/lib/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabase';
import { slugify } from '@/lib/format';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const supabase = getSupabaseAdmin();
  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'Name required' });
    const slug = slugify(b.slug || b.name);
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: b.name,
        slug,
        description: b.description || null,
        product_type: b.product_type || 'physical',
        base_price_cents: Number(b.base_price_cents) || 0,
        digital_file_url: b.digital_file_url || null,
        category_id: b.category_id || null,
        active: false, // start as draft
      })
      .select('id')
      .single();
    if (error) return res.status(500).json({ error: error.message });

    // Always create a "default" variant so checkout works even without variants.
    await supabase.from('product_variants').insert({
      product_id: data.id,
      name: 'default',
      options: {},
      inventory: 0,
      active: true,
    });

    return res.status(200).json({ id: data.id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
