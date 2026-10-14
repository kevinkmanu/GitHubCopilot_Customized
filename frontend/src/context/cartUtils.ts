export interface CartItem {
  productId: number;
  name: string;
  imgName: string;
  unitPrice: number;
  quantity: number;
}

export interface AppliedCoupon {
  code: string;
  percent: number;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  grandTotal: number;
}

export const FLAT_SHIPPING = 10;

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const lineTotal = (item: Pick<CartItem, 'unitPrice' | 'quantity'>) => round(item.unitPrice * item.quantity);

// Client-side estimate shown immediately; the server quote is authoritative.
export function calculateTotals(items: CartItem[], coupon: AppliedCoupon | null): CartTotals {
  const subtotal = round(items.reduce((sum, item) => sum + lineTotal(item), 0));
  const discount = coupon ? round((subtotal * coupon.percent) / 100) : 0;
  const shipping = items.length > 0 ? FLAT_SHIPPING : 0;
  return { subtotal, discount, shipping, grandTotal: round(subtotal - discount + shipping) };
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

// Returns the parsed quantity when it is an integer >= 1, otherwise null.
export function parseQuantity(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
}
