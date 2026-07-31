import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { FiSearch, FiShoppingBag, FiUser, FiLogOut } from 'react-icons/fi';
import { useCart } from '@/context/CartContext';

export default function Header() {
  const router = useRouter();
  const { data: session } = useSession();
  const { itemCount } = useCart();
  const [q, setQ] = useState('');
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Shop';

  function onSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-brand-600">
          {storeName}
        </Link>

        <nav className="hidden gap-4 text-sm text-slate-700 md:flex">
          <Link href="/products" className="hover:text-brand-600">Shop</Link>
          <Link href="/products?category=apparel" className="hover:text-brand-600">Apparel</Link>
          <Link href="/products?category=accessories" className="hover:text-brand-600">Accessories</Link>
          <Link href="/products?category=digital" className="hover:text-brand-600">Digital</Link>
        </nav>

        <form onSubmit={onSearch} className="ml-auto flex flex-1 max-w-md items-center">
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-2.5 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search products..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </form>

        <Link
          href="/cart"
          className="relative inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-100"
          aria-label="Cart"
        >
          <FiShoppingBag />
          <span className="text-sm">Cart</span>
          {itemCount > 0 && (
            <span className="absolute -right-2 -top-2 rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-bold text-white">
              {itemCount}
            </span>
          )}
        </Link>

        {session ? (
          <div className="flex items-center gap-2">
            <Link href="/account" className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-100">
              <FiUser /> <span className="hidden sm:inline text-sm">Account</span>
            </Link>
            {session.user?.isAdmin && (
              <Link href="/admin" className="text-sm font-medium text-brand-600 hover:underline">
                Admin
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
              aria-label="Sign out"
            >
              <FiLogOut />
            </button>
          </div>
        ) : (
          <Link href="/auth/signin" className="text-sm font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
