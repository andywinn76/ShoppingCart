import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { email, password, name } = req.body || {};
  if (!email || !password || password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Email and 8+ character password required' });
  }
  try {
    const supabase = getSupabaseAdmin();
    const normalizedEmail = String(email).toLowerCase().trim();
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { error } = await supabase.from('profiles').insert({
      email: normalizedEmail,
      name: name || null,
      password_hash,
    });
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
}
