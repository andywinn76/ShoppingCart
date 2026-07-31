import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import Layout from '@/components/Layout';
import { authOptions } from '@/lib/auth';

export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) {
    return { redirect: { destination: '/auth/signin?callbackUrl=/account/addresses', permanent: false } };
  }
  return { props: {} };
}

const blank = {
  label: '',
  full_name: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postal_code: '',
  country: 'US',
  phone: '',
  is_default: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch('/api/account/addresses');
    const data = await res.json();
    setAddresses(data.addresses || []);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/account/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setForm(blank);
      load();
    } else {
      const d = await res.json();
      alert(d.error || 'Could not save address');
    }
  }

  async function remove(id) {
    if (!confirm('Delete this address?')) return;
    const res = await fetch(`/api/account/addresses?id=${id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  return (
    <Layout title="Addresses">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/account" className="text-sm text-brand-600 hover:underline">
          &lt;- Account
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Saved addresses</h1>

        <ul className="mt-6 space-y-3">
          {addresses.map((a) => (
            <li key={a.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {a.label || 'Address'} {a.is_default && <span className="ml-1 rounded bg-brand-100 px-2 py-0.5 text-xs text-brand-700">Default</span>}
                  </p>
                  <p className="text-sm text-slate-600">{a.full_name}</p>
                  <p className="text-sm text-slate-600">
                    {a.line1}{a.line2 ? `, ${a.line2}` : ''}
                  </p>
                  <p className="text-sm text-slate-600">
                    {a.city}, {a.region} {a.postal_code}, {a.country}
                  </p>
                </div>
                <button onClick={() => remove(a.id)} className="text-sm text-slate-500 hover:text-red-600">
                  Delete
                </button>
              </div>
            </li>
          ))}
          {addresses.length === 0 && <p className="text-slate-500">No saved addresses yet.</p>}
        </ul>

        <form onSubmit={save} className="card mt-8 grid gap-3 p-4 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Add a new address</h2>
          <Field label="Label" value={form.label} onChange={(v) => setForm({ ...form, label: v })} />
          <Field label="Full name *" value={form.full_name} required onChange={(v) => setForm({ ...form, full_name: v })} />
          <Field label="Address line 1 *" required value={form.line1} onChange={(v) => setForm({ ...form, line1: v })} />
          <Field label="Address line 2" value={form.line2} onChange={(v) => setForm({ ...form, line2: v })} />
          <Field label="City *" required value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="State / Region *" required value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
          <Field label="Postal code *" required value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
          <Field label="Country *" required value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            />
            Make this my default address
          </label>
          <button className="btn-primary sm:col-span-2" disabled={loading}>
            {loading ? 'Saving...' : 'Save address'}
          </button>
        </form>
      </div>
    </Layout>
  );
}

function Field({ label, value, onChange, required }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
