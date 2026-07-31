import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children, title, description }) {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'My Shop';
  const tagline = process.env.NEXT_PUBLIC_STORE_TAGLINE || '';
  const pageTitle = title ? `${title} -- ${storeName}` : storeName;
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description || tagline} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </>
  );
}
