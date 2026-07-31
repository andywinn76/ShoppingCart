import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import Layout from '@/components/Layout';

export default function SignInPage() {
  const router = useRouter();
  const callbackUrl = router.query.callbackUrl || '/account';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setErr('Invalid email or password');
      return;
    }
    router.push(res?.url || callbackUrl);
  }

  return (
    <Layout title="Sign in">
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          New here?{' '}
          <Link href="/auth/register" className="text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </Layout>
  );
}
