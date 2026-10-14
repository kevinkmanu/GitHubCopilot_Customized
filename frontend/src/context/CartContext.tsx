import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import axios from 'axios';
import { api } from '../api/config';
import { useAuth } from './AuthContext';
import { AppliedCoupon, CartItem } from './cartUtils';

const STORAGE_KEY = 'octocat-cart';

interface StoredCart {
  items: CartItem[];
  coupon: AppliedCoupon | null;
}

interface CartContextType {
  items: CartItem[];
  coupon: AppliedCoupon | null;
  itemCount: number;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  updateQuantities: (quantities: Record<number, number>) => void;
  removeItem: (productId: number) => void;
  applyCoupon: (coupon: AppliedCoupon | null) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

function loadStoredCart(): StoredCart {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (parsed && Array.isArray(parsed.items)) {
      return { items: parsed.items, coupon: parsed.coupon ?? null };
    }
  } catch {
    // Corrupt storage falls through to an empty cart.
  }
  return { items: [], coupon: null };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, userEmail } = useAuth();
  const [cart, setCart] = useState<StoredCart>(loadStoredCart);
  const syncedUser = useRef<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // On login, merge the server-side cart with the guest cart.
  useEffect(() => {
    if (!isLoggedIn || !userEmail) {
      syncedUser.current = null;
      return;
    }
    let cancelled = false;
    const url = `${api.baseURL}${api.endpoints.cart}`;
    (async () => {
      try {
        const { data: saved } = await axios.get(`${url}/${encodeURIComponent(userEmail)}`);
        const quantities = new Map<number, number>();
        [...(saved.items ?? []), ...cart.items].forEach((i: { productId: number; quantity: number }) =>
          quantities.set(i.productId, Math.max(quantities.get(i.productId) ?? 0, i.quantity))
        );
        if (quantities.size > 0) {
          const couponCode = cart.coupon?.code ?? saved.couponCode ?? undefined;
          const { data: quote } = await axios.post(`${url}/quote`, {
            items: [...quantities].map(([productId, quantity]) => ({ productId, quantity })),
            couponCode,
          });
          if (!cancelled) {
            setCart({
              items: quote.items,
              coupon: quote.couponCode ? { code: quote.couponCode, percent: quote.discountPercent } : null,
            });
          }
        }
      } catch {
        // Keep the local cart if the server is unreachable or rejects the merge.
      } finally {
        if (!cancelled) syncedUser.current = userEmail;
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run when the user changes; the current cart is read once at login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userEmail]);

  // Persist changes to the server for logged-in users.
  useEffect(() => {
    if (!isLoggedIn || !userEmail || syncedUser.current !== userEmail) return;
    axios
      .put(`${api.baseURL}${api.endpoints.cart}/${encodeURIComponent(userEmail)}`, {
        items: cart.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        couponCode: cart.coupon?.code ?? null,
      })
      .catch(() => undefined);
  }, [cart, isLoggedIn, userEmail]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity: number) => {
    setCart(prev => {
      const existing = prev.items.find(i => i.productId === item.productId);
      const items = existing
        ? prev.items.map(i => (i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i))
        : [...prev.items, { ...item, quantity }];
      return { ...prev, items };
    });
  }, []);

  const updateQuantities = useCallback((quantities: Record<number, number>) => {
    setCart(prev => ({
      ...prev,
      items: prev.items.map(i => (quantities[i.productId] ? { ...i, quantity: quantities[i.productId] } : i)),
    }));
  }, []);

  const removeItem = useCallback((productId: number) => {
    setCart(prev => {
      const items = prev.items.filter(i => i.productId !== productId);
      return { items, coupon: items.length > 0 ? prev.coupon : null };
    });
  }, []);

  const applyCoupon = useCallback((coupon: AppliedCoupon | null) => {
    setCart(prev => ({ ...prev, coupon }));
  }, []);

  const clearCart = useCallback(() => setCart({ items: [], coupon: null }), []);

  const value = useMemo<CartContextType>(
    () => ({
      items: cart.items,
      coupon: cart.coupon,
      itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      addItem,
      updateQuantities,
      removeItem,
      applyCoupon,
      clearCart,
    }),
    [cart, addItem, updateQuantities, removeItem, applyCoupon, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
