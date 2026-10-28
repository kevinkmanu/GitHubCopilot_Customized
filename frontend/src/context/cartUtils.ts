export interface CartItem {
  productId: number;
  name: string;
  imgName: string;
  unitPrice: number;
  quantity: number;
}

export interface AppliedCoupon {
  code: string;
  discountRate: number;
}

export interface CartState {
  items: CartItem[];
  coupon: AppliedCoupon | null;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  grandTotal: number;
}

export type CartAction =
  | { type: 'add'; item: Omit<CartItem, 'quantity'>; quantity: number }
  | { type: 'setQuantities'; quantities: Record<number, number> }
  | { type: 'remove'; productId: number }
  | { type: 'applyCoupon'; coupon: AppliedCoupon }
  | { type: 'removeCoupon' };

export const SHIPPING_FEE = 10;
export const CART_STORAGE_KEY = 'octocat-cart-v1';

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const formatCurrency = (amount: number) => currencyFormatter.format(amount);

export const roundCurrency = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

export const lineTotal = (item: CartItem) => roundCurrency(item.unitPrice * item.quantity);

export function calculateTotals(items: CartItem[], coupon: AppliedCoupon | null): CartTotals {
  const subtotal = roundCurrency(items.reduce((sum, item) => sum + lineTotal(item), 0));
  const discount = coupon ? roundCurrency(subtotal * coupon.discountRate) : 0;
  const shipping = items.length > 0 ? SHIPPING_FEE : 0;
  return { subtotal, discount, shipping, grandTotal: roundCurrency(subtotal - discount + shipping) };
}

// Returns a whole number >= 1, or null when the text is not a valid quantity.
export function parseQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
}

export const emptyCart: CartState = { items: [], coupon: null };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const exists = state.items.some(i => i.productId === action.item.productId);
      const items = exists
        ? state.items.map(i =>
            i.productId === action.item.productId ? { ...i, quantity: i.quantity + action.quantity } : i
          )
        : [...state.items, { ...action.item, quantity: action.quantity }];
      return { ...state, items };
    }
    case 'setQuantities':
      return {
        ...state,
        items: state.items.map(i => {
          const next = action.quantities[i.productId];
          return next !== undefined && Number.isSafeInteger(next) && next >= 1 ? { ...i, quantity: next } : i;
        }),
      };
    case 'remove': {
      const items = state.items.filter(i => i.productId !== action.productId);
      // An empty cart has no coupon UI, so don't leave a hidden discount behind.
      return { items, coupon: items.length > 0 ? state.coupon : null };
    }
    case 'applyCoupon':
      return { ...state, coupon: action.coupon };
    case 'removeCoupon':
      return { ...state, coupon: null };
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false;
  return (
    Number.isSafeInteger(value.productId) &&
    typeof value.name === 'string' &&
    // imgName is rendered into an <img src>; restrict it to a plain file name.
    typeof value.imgName === 'string' && /^[\w.-]+$/.test(value.imgName) &&
    typeof value.unitPrice === 'number' && Number.isFinite(value.unitPrice) && value.unitPrice >= 0 &&
    Number.isSafeInteger(value.quantity) && (value.quantity as number) >= 1
  );
}

function isCoupon(value: unknown): value is AppliedCoupon {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    typeof value.discountRate === 'number' && value.discountRate > 0 && value.discountRate <= 1
  );
}

// Storage is user-editable, so anything malformed falls back to an empty cart.
export function loadCartState(): CartState {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? 'null');
    if (!isRecord(parsed) || !Array.isArray(parsed.items)) return emptyCart;
    const ids = new Set<number>();
    for (const item of parsed.items) {
      if (!isCartItem(item) || ids.has(item.productId)) return emptyCart;
      ids.add(item.productId);
    }
    return { items: parsed.items as CartItem[], coupon: isCoupon(parsed.coupon) ? parsed.coupon : null };
  } catch {
    return emptyCart;
  }
}

export function saveCartState(state: CartState) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode, quota); the cart still works in memory.
  }
}
