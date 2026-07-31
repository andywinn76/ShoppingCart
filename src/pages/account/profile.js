import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import Layout from '@/components/Layout';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) {
    return { redirect: { destination: '/auth/signin?callbackUrl=/account/profile', permanent: false } };
  }
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, phone')
    .eq('email', session.user.email.toLowerCase())
    .maybeSingle();
  return { props: { profile: profile || { email: session.user.email, name: '', phone: '' } } };
}

export default function ProfilePage({ profile }) {
  const [name, setName] = useState(profile.name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const res = await fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    });
    setLoading(false);
    if (res.ok) setMsg('Saved.');
    else setMsg('Could not save.');
  }

  return (
    <Layout title="Profile">
      <div className="mx-auto max-w-md px-4 py-8">
        <Link href="/account" className="text-sm text-brand-600 hover:underline">
          &lt;- Account
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Profile</h1>
        <form onSubmit={save} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-100" value={profile.email} disabled />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {msg && <p className="text-sm text-green-700">{msg}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
