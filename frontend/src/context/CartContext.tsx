/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useReducer, ReactNode } from 'react';
import {
  AppliedCoupon,
  CartItem,
  CartTotals,
  calculateTotals,
  cartReducer,
  loadCartState,
  saveCartState,
} from './cartUtils';

interface CartContextType {
  items: CartItem[];
  coupon: AppliedCoupon | null;
  totals: CartTotals;
  itemCount: number;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  updateQuantities: (quantities: Record<number, number>) => void;
  removeItem: (productId: number) => void;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCartState);

  useEffect(() => {
    saveCartState(state);
  }, [state]);

  const value = useMemo<CartContextType>(
    () => ({
      items: state.items,
      coupon: state.coupon,
      totals: calculateTotals(state.items, state.coupon),
      itemCount: state.items.reduce((sum, item) => sum + item.quantity, 0),
      addItem: (item, quantity) => dispatch({ type: 'add', item, quantity }),
      updateQuantities: quantities => dispatch({ type: 'setQuantities', quantities }),
      removeItem: productId => dispatch({ type: 'remove', productId }),
      applyCoupon: coupon => dispatch({ type: 'applyCoupon', coupon }),
      removeCoupon: () => dispatch({ type: 'removeCoupon' }),
    }),
    [state]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
