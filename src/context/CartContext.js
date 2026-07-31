// Client-side cart, persisted to localStorage so it survives reloads and the
// guest -> auth handoff. Lines reference variant_id (the source of truth for
// price and inventory at checkout time -- the server re-verifies prices).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'my_shop_cart_v1';

export function CartProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount only (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch (_) {}
    setHydrated(true);
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch (_) {}
  }, [lines, hydrated]);

  const addItem = useCallback((line) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.variant_id === line.variant_id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + line.quantity };
        return next;
      }
      return [...prev, line];
    });
  }, []);

  const updateQuantity = useCallback((variantId, quantity) => {
    setLines((prev) =>
      prev
        .map((l) => (l.variant_id === variantId ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((variantId) => {
    setLines((prev) => prev.filter((l) => l.variant_id !== variantId));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
  }, []);

  const subtotalCents = useMemo(
    () => lines.reduce((sum, l) => sum + l.unit_price_cents * l.quantity, 0),
    [lines]
  );
  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines]
  );
  const hasPhysical = useMemo(
    () => lines.some((l) => l.product_type !== 'digital'),
    [lines]
  );

  return (
    <CartContext.Provider
      value={{
        lines,
        addItem,
        updateQuantity,
        removeItem,
        clear,
        subtotalCents,
        itemCount,
        hasPhysical,
        hydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
