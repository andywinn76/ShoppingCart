import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', session.user.email.toLowerCase())
    .maybeSingle();
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  if (req.method === 'GET') {
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('profile_id', profile.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    return res.status(200).json({ addresses: data || [] });
  }

  if (req.method === 'POST') {
    const a = req.body || {};
    const required = ['full_name', 'line1', 'city', 'region', 'postal_code', 'country'];
    for (const k of required) {
      if (!a[k]) return res.status(400).json({ error: `Missing field: ${k}` });
    }
    if (a.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('profile_id', profile.id);
    }
    const { error } = await supabase.from('addresses').insert({
      profile_id: profile.id,
      label: a.label || null,
      full_name: a.full_name,
      line1: a.line1,
      line2: a.line2 || null,
      city: a.city,
      region: a.region,
      postal_code: a.postal_code,
      country: a.country,
      phone: a.phone || null,
      is_default: !!a.is_default,
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('profile_id', profile.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
