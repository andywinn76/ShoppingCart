import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';
import Head from 'next/head';
import { FiBox, FiShoppingBag, FiHome, FiLogOut, FiPackage } from 'react-icons/fi';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: FiHome },
  { href: '/admin/products', label: 'Products', icon: FiBox },
  { href: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
  { href: '/admin/inventory', label: 'Inventory', icon: FiPackage },
];

export default function AdminLayout({ children, title }) {
  const router = useRouter();
  return (
    <>
      <Head>
        <title>{title ? `${title} -- Admin` : 'Admin'}</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/admin" className="text-lg font-bold text-brand-600">Admin</Link>
            <nav className="flex flex-1 flex-wrap gap-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active =
                  href === '/admin'
                    ? router.pathname === '/admin'
                    : router.pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={
                      'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ' +
                      (active
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100')
                    }
                  >
                    <Icon /> {label}
                  </Link>
                );
              })}
            </nav>
            <Link href="/" className="text-sm text-slate-600 hover:text-brand-600">
              View store
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-red-600"
            >
              <FiLogOut /> Sign out
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </>
  );
}

// Server-side guard helper. Use in admin pages' getServerSideProps:
//   export const getServerSideProps = withAdmin();
export function withAdmin(extra) {
  return async (ctx) => {
    const { getServerSession } = await import('next-auth/next');
    const { authOptions } = await import('@/lib/auth');
    const session = await getServerSession(ctx.req, ctx.res, authOptions);
    if (!session || !session.user?.isAdmin) {
      return {
        redirect: {
          destination: `/auth/signin?callbackUrl=${encodeURIComponent(ctx.resolvedUrl)}`,
          permanent: false,
        },
      };
    }
    // Sanitize undefined values so Next.js can serialize the session as JSON.
    const safeSession = {
      ...session,
      user: {
        ...session.user,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      },
    };
    if (typeof extra === 'function') {
      const res = await extra(ctx, session);
      if (res?.redirect || res?.notFound) return res;
      return { props: { session: safeSession, ...(res?.props || {}) } };
    }
    return { props: { session: safeSession } };
  };
}
