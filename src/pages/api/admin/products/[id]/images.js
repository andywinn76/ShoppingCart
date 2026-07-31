import { requireAdmin } from '@/lib/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabase';
import { cloudinary } from '@/lib/cloudinary';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const { id } = req.query;
  const supabase = getSupabaseAdmin();

  if (req.method === 'POST') {
    const { url, public_id, alt, sort_order } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url required' });
    const { data, error } = await supabase
      .from('product_images')
      .insert({
        product_id: id,
        url,
        public_id: public_id || null,
        alt: alt || null,
        sort_order: sort_order ?? 0,
      })
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ image: data });
  }

  if (req.method === 'DELETE') {
    const imageId = req.query.id;
    // Find the image first so we can clean up Cloudinary.
    const { data: img } = await supabase
      .from('product_images')
      .select('public_id')
      .eq('id', imageId)
      .maybeSingle();
    const { error } = await supabase.from('product_images').delete().eq('id', imageId);
    if (error) return res.status(500).json({ error: error.message });
    if (img?.public_id && process.env.CLOUDINARY_API_SECRET) {
      try {
        await cloudinary.uploader.destroy(img.public_id);
      } catch (_) {}
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
