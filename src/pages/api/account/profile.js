import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, phone } = req.body || {};
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('profiles')
    .update({ name: name || null, phone: phone || null })
    .eq('email', session.user.email.toLowerCase());
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
