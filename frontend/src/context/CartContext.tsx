import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Cart, CartItem, CartContextType, Product, AppliedCoupon } from '../types/cart';
import axios from 'axios';
import { api } from '../api/config';

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'octocat_cart';
const SHIPPING_COST = 10.0;

function calculateCartSummary(items: CartItem[], appliedCoupon?: AppliedCoupon) {
  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
  let discount = 0;
  let discountPercentage = 0;
  
  if (appliedCoupon?.isValid) {
    if (appliedCoupon.discountType === 'percentage') {
      discount = subtotal * (appliedCoupon.discountValue / 100);
      discountPercentage = appliedCoupon.discountValue;
    } else {
      discount = appliedCoupon.discountValue;
      discountPercentage = (discount / subtotal) * 100;
    }
  }

  const grandTotal = subtotal - discount + SHIPPING_COST;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    discountPercentage: Math.round(discountPercentage * 100) / 100,
    shipping: SHIPPING_COST,
    grandTotal: Math.round(grandTotal * 100) / 100,
    appliedCoupon,
  };
}

function initializeCart(items: CartItem[] = [], appliedCoupon?: AppliedCoupon): Cart {
  return {
    cartId: `cart_${Date.now()}`,
    items,
    summary: calculateCartSummary(items, appliedCoupon),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedCart = localStorage.getItem(STORAGE_KEY);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        setCart(initializeCart());
      }
    } else {
      setCart(initializeCart());
    }
  }, []);

  const saveCart = useCallback((updatedCart: Cart) => {
    setCart(updatedCart);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCart));
  }, []);

  const addItem = useCallback((product: Product, quantity: number) => {
    if (!cart) return;
    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    const existingItem = cart.items.find(item => item.productId === product.productId);
    let updatedItems: CartItem[];

    if (existingItem) {
      updatedItems = cart.items.map(item =>
        item.productId === product.productId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      updatedItems = [...cart.items, { productId: product.productId, product, quantity }];
    }

    const updatedCart: Cart = {
      ...cart,
      items: updatedItems,
      summary: calculateCartSummary(updatedItems, cart.summary.appliedCoupon),
      updatedAt: new Date().toISOString(),
    };

    saveCart(updatedCart);
    setError(null);
  }, [cart, saveCart]);

  const updateItemQuantity = useCallback((productId: number, quantity: number) => {
    if (!cart) return;
    if (quantity < 0) {
      setError('Quantity cannot be negative');
      return;
    }

    let updatedItems: CartItem[];
    
    if (quantity === 0) {
      updatedItems = cart.items.filter(item => item.productId !== productId);
    } else {
      updatedItems = cart.items.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      );
    }

    const updatedCart: Cart = {
      ...cart,
      items: updatedItems,
      summary: calculateCartSummary(updatedItems, cart.summary.appliedCoupon),
      updatedAt: new Date().toISOString(),
    };

    saveCart(updatedCart);
    setError(null);
  }, [cart, saveCart]);

  const removeItem = useCallback((productId: number) => {
    if (!cart) return;

    const updatedItems = cart.items.filter(item => item.productId !== productId);
    const updatedCart: Cart = {
      ...cart,
      items: updatedItems,
      summary: calculateCartSummary(updatedItems, cart.summary.appliedCoupon),
      updatedAt: new Date().toISOString(),
    };

    saveCart(updatedCart);
    setError(null);
  }, [cart, saveCart]);

  const applyCoupon = useCallback(async (code: string) => {
    if (!cart) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${api.baseURL}/api/coupons/validate`,
        { code, orderAmount: cart.summary.subtotal }
      );

      const couponData = response.data;

      const appliedCoupon: AppliedCoupon = {
        code: couponData.code,
        discountType: couponData.discountType,
        discountValue: couponData.discountValue,
        minOrderAmount: couponData.minOrderAmount,
        isValid: couponData.isValid,
        message: couponData.message,
      };

      if (!couponData.isValid) {
        setError(couponData.message || 'Invalid coupon code');
        return;
      }

      const updatedCart: Cart = {
        ...cart,
        summary: calculateCartSummary(cart.items, appliedCoupon),
        updatedAt: new Date().toISOString(),
      };

      saveCart(updatedCart);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to validate coupon';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [cart, saveCart]);

  const clearCart = useCallback(() => {
    const newCart = initializeCart();
    saveCart(newCart);
    setError(null);
  }, [saveCart]);

  const value: CartContextType = {
    cart,
    addItem,
    updateItemQuantity,
    removeItem,
    applyCoupon,
    clearCart,
    isLoading,
    error,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
