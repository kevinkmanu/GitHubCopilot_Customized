export interface CartProduct {
  productId: number;
  name: string;
  description: string;
  price: number;
  imgName: string;
  sku: string;
  unit: string;
  supplierId: number;
  discount?: number;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

export const COUPON_CODE = 'SAVE5';
export const COUPON_DISCOUNT_RATE = 0.05;
export const SHIPPING_COST = 10;

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (amount: number) => amount / 100;

export function getUnitPrice(product: CartProduct): number {
  return fromCents(toCents(product.price * (1 - (product.discount ?? 0))));
}

export function addProductToCart(items: CartItem[], product: CartProduct, quantity: number): CartItem[] {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return items;
  }

  const existing = items.find(item => item.product.productId === product.productId);
  if (existing) {
    return items.map(item => item.product.productId === product.productId
      ? { ...item, quantity: item.quantity + quantity }
      : item);
  }

  return [...items, { product, quantity }];
}

export function updateCartQuantity(items: CartItem[], productId: number, quantity: number): CartItem[] {
  if (!Number.isInteger(quantity) || quantity < 0) {
    return items;
  }

  return items
    .map(item => item.product.productId === productId ? { ...item, quantity } : item)
    .filter(item => item.quantity > 0);
}

export function removeCartItem(items: CartItem[], productId: number): CartItem[] {
  return items.filter(item => item.product.productId !== productId);
}

export function isValidCoupon(code: string): boolean {
  return code.trim().toUpperCase() === COUPON_CODE;
}

export function calculateCartTotals(items: CartItem[], couponApplied: boolean): CartTotals {
  const subtotalCents = items.reduce(
    (sum, item) => sum + toCents(getUnitPrice(item.product)) * item.quantity,
    0,
  );
  const discountCents = couponApplied
    ? Math.round(subtotalCents * COUPON_DISCOUNT_RATE)
    : 0;
  const shippingCents = items.length > 0 ? toCents(SHIPPING_COST) : 0;

  return {
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    shipping: fromCents(shippingCents),
    total: fromCents(subtotalCents - discountCents + shippingCents),
  };
}

export function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  const product = item.product as Partial<CartProduct> | undefined;
  return !!product
    && Number.isInteger(product.productId)
    && typeof product.name === 'string'
    && typeof product.description === 'string'
    && typeof product.price === 'number'
    && Number.isFinite(product.price)
    && product.price >= 0
    && typeof product.imgName === 'string'
    && typeof product.sku === 'string'
    && typeof product.unit === 'string'
    && Number.isInteger(product.supplierId)
    && (product.discount === undefined || (typeof product.discount === 'number' && product.discount >= 0 && product.discount <= 1))
    && Number.isInteger(item.quantity)
    && (item.quantity ?? 0) > 0;
}
