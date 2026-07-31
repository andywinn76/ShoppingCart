import { getServerSession } from "next-auth/next";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Layout from "@/components/Layout";
import { authOptions } from "@/lib/auth";

export async function getServerSideProps(ctx) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);

  if (!session?.user?.email) {
    return {
      redirect: {
        destination: "/auth/signin?callbackUrl=/account",
        permanent: false,
      },
    };
  }

  // Sanitize undefined values so Next.js can serialize the props.
  // Returning session here pre-populates SessionProvider via _app.js,
  // so useSession() in the component will have it immediately (no loading flash).
  return {
    props: {
      session: {
        ...session,
        user: {
          ...session.user,
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
        },
      },
    },
  };
}

export default function AccountPage() {
  const { data: session } = useSession();
  return (
    <Layout title="My account">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-semibold">
          Welcome{session?.user?.name ? `, ${session.user.name}` : ' back'}!
        </h1>
        <p className="mt-1 text-slate-600">
          Signed in as <strong>{session?.user?.email}</strong>
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <AccountTile
            href="/account/orders"
            title="Order history"
            subtitle="View past orders"
          />
          <AccountTile
            href="/account/addresses"
            title="Addresses"
            subtitle="Manage shipping addresses"
          />
          <AccountTile
            href="/account/profile"
            title="Profile"
            subtitle="Update your details"
          />
        </div>
      </div>
    </Layout>
  );
}

function AccountTile({ href, title, subtitle }) {
  return (
    <Link href={href} className="card block p-4 transition hover:shadow-md">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </Link>
  );
}
