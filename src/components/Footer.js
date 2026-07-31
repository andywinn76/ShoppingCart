import Link from 'next/link';

export default function Footer() {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Shop';
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/products" className="hover:text-brand-600">Shop</Link>
            <Link href="/account" className="hover:text-brand-600">Account</Link>
            <Link href="/cart" className="hover:text-brand-600">Cart</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
