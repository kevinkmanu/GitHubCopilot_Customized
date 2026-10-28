import { describe, it, expect } from 'vitest';
import {
  CART_STORAGE_KEY,
  CartItem,
  calculateTotals,
  cartReducer,
  emptyCart,
  formatCurrency,
  loadCartState,
  parseQuantity,
  saveCartState,
} from './cartUtils';

const product = { productId: 1, name: 'Solar Panel', imgName: 'solar.png', unitPrice: 89 };

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  ...product,
  quantity: 1,
  ...overrides,
});

describe('calculateTotals', () => {
  it('matches the design mock-up: 3 x $89 with a 5% coupon', () => {
    const items = [item({ productId: 1 }), item({ productId: 2 }), item({ productId: 3 })];
    expect(calculateTotals(items, { code: 'SAVE5', discountRate: 0.05 })).toEqual({
      subtotal: 267,
      discount: 13.35,
      shipping: 10,
      grandTotal: 263.65,
    });
  });

  it('adds flat shipping and no discount when no coupon is applied', () => {
    expect(calculateTotals([item({ quantity: 2 })], null)).toEqual({
      subtotal: 178,
      discount: 0,
      shipping: 10,
      grandTotal: 188,
    });
  });

  it('charges no shipping for an empty cart', () => {
    expect(calculateTotals([], { code: 'SAVE5', discountRate: 0.05 })).toEqual({
      subtotal: 0,
      discount: 0,
      shipping: 0,
      grandTotal: 0,
    });
  });

  it('rounds to cents to avoid floating point drift', () => {
    const totals = calculateTotals([item({ unitPrice: 0.1, quantity: 3 })], null);
    expect(totals.subtotal).toBe(0.3);
    expect(totals.grandTotal).toBe(10.3);
  });
});

describe('formatCurrency', () => {
  it('always shows two decimals', () => {
    expect(formatCurrency(89)).toBe('$89.00');
    expect(formatCurrency(263.65)).toBe('$263.65');
  });
});

describe('parseQuantity', () => {
  it.each([
    ['1', 1],
    ['12', 12],
    [' 3 ', 3],
    ['007', 7],
  ])('accepts %j', (text, expected) => {
    expect(parseQuantity(text)).toBe(expected);
  });

  it.each(['', '  ', '0', '-1', '1.5', '1e3', 'abc', '99999999999999999999'])('rejects %j', text => {
    expect(parseQuantity(text)).toBeNull();
  });
});

describe('cartReducer', () => {
  it('adds a new item', () => {
    const state = cartReducer(emptyCart, { type: 'add', item: product, quantity: 2 });
    expect(state.items).toEqual([item({ quantity: 2 })]);
  });

  it('merges quantities when the product is already in the cart', () => {
    const start = { ...emptyCart, items: [item({ quantity: 2 })] };
    const state = cartReducer(start, { type: 'add', item: product, quantity: 3 });
    expect(state.items).toEqual([item({ quantity: 5 })]);
  });

  it('sets quantities, ignoring invalid values and unknown products', () => {
    const start = { ...emptyCart, items: [item({ productId: 1 }), item({ productId: 2 })] };
    const state = cartReducer(start, {
      type: 'setQuantities',
      quantities: { 1: 4, 2: 0, 99: 3 },
    });
    expect(state.items.map(i => i.quantity)).toEqual([4, 1]);
  });

  it('removes an item', () => {
    const start = { ...emptyCart, items: [item({ productId: 1 }), item({ productId: 2 })] };
    expect(cartReducer(start, { type: 'remove', productId: 1 }).items.map(i => i.productId)).toEqual([2]);
  });

  it('keeps the coupon while items remain and drops it when the cart becomes empty', () => {
    const coupon = { code: 'SAVE5', discountRate: 0.05 };
    const start = { items: [item({ productId: 1 }), item({ productId: 2 })], coupon };
    const afterFirst = cartReducer(start, { type: 'remove', productId: 1 });
    expect(afterFirst.coupon).toEqual(coupon);
    expect(cartReducer(afterFirst, { type: 'remove', productId: 2 }).coupon).toBeNull();
  });

  it('applies and removes a coupon', () => {
    const coupon = { code: 'SAVE5', discountRate: 0.05 };
    const applied = cartReducer(emptyCart, { type: 'applyCoupon', coupon });
    expect(applied.coupon).toEqual(coupon);
    expect(cartReducer(applied, { type: 'removeCoupon' }).coupon).toBeNull();
  });
});

describe('cart persistence', () => {
  it('round-trips through storage', () => {
    const state = { items: [item({ quantity: 3 })], coupon: { code: 'SAVE5', discountRate: 0.05 } };
    saveCartState(state);
    expect(loadCartState()).toEqual(state);
  });

  it('returns an empty cart when nothing is stored', () => {
    expect(loadCartState()).toEqual(emptyCart);
  });

  it('returns an empty cart for corrupt JSON', () => {
    localStorage.setItem(CART_STORAGE_KEY, '{not json');
    expect(loadCartState()).toEqual(emptyCart);
  });

  it.each([
    ['a non-integer quantity', { items: [item({ quantity: 1.5 })] }],
    ['a zero quantity', { items: [item({ quantity: 0 })] }],
    ['a negative price', { items: [item({ unitPrice: -1 })] }],
    ['a missing name', { items: [{ ...item(), name: undefined }] }],
    ['an image path that is not a plain file name', { items: [item({ imgName: '//evil.example/x.png' })] }],
    ['duplicate products', { items: [item(), item()] }],
    ['items that are not an array', { items: 'nope' }],
  ])('discards stored state with %s', (_label, stored) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stored));
    expect(loadCartState()).toEqual(emptyCart);
  });

  it('drops an invalid coupon but keeps the items', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: [item()], coupon: { code: 'X', discountRate: 5 } })
    );
    expect(loadCartState()).toEqual({ items: [item()], coupon: null });
  });
});
