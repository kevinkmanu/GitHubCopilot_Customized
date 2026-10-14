import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  addProductToCart,
  calculateCartTotals,
  isCartItem,
  isValidCoupon,
  removeCartItem,
  updateCartQuantity,
  type CartItem,
  type CartProduct,
  type CartTotals,
} from './cartUtils';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totals: CartTotals;
  couponApplied: boolean;
  addToCart: (product: CartProduct, quantity: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  applyCoupon: (code: string) => boolean;
  clearCart: () => void;
}

const STORAGE_KEY = 'octocat-cart';
const CartContext = createContext<CartContextValue | null>(null);

function readSavedCart(): CartItem[] {
  try {
    const storedCart = localStorage.getItem(STORAGE_KEY);
    if (!storedCart) return [];

    const parsed: unknown = JSON.parse(storedCart);
    if (!Array.isArray(parsed)) {
      console.error('Saved cart data is invalid; starting with an empty cart.');
      return [];
    }

    return parsed.filter(isCartItem);
  } catch (error) {
    console.error('Unable to load the saved cart.', error);
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readSavedCart);
  const [couponApplied, setCouponApplied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Unable to save the cart.', error);
    }
  }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    totals: calculateCartTotals(items, couponApplied),
    couponApplied,
    addToCart: (product, quantity) => setItems(current => addProductToCart(current, product, quantity)),
    updateQuantity: (productId, quantity) => setItems(current => updateCartQuantity(current, productId, quantity)),
    removeItem: productId => setItems(current => removeCartItem(current, productId)),
    applyCoupon: code => {
      const valid = isValidCoupon(code);
      if (valid) setCouponApplied(true);
      return valid;
    },
    clearCart: () => {
      setItems([]);
      setCouponApplied(false);
    },
  }), [items, couponApplied]);

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
