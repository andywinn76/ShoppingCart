import '@/styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { CartProvider } from '@/context/CartContext';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </SessionProvider>
  );
}
