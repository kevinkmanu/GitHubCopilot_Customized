import { describe, expect, it } from 'vitest';
import {
  addProductToCart,
  calculateCartTotals,
  getUnitPrice,
  isValidCoupon,
  removeCartItem,
  updateCartQuantity,
  type CartItem,
  type CartProduct,
} from './cartUtils';

const product: CartProduct = {
  productId: 1,
  name: 'SmartFeeder One',
  description: 'A smart feeder.',
  price: 267,
  imgName: 'feeder.png',
  sku: 'CAT-FEED-001',
  unit: 'piece',
  supplierId: 1,
};

describe('cart calculations', () => {
  it('calculates the requested $267 subtotal, 5% discount, shipping, and total', () => {
    const totals = calculateCartTotals([{ product, quantity: 1 }], true);

    expect(totals).toEqual({
      subtotal: 267,
      discount: 13.35,
      shipping: 10,
      total: 263.65,
    });
  });

  it('charges no shipping for an empty cart', () => {
    expect(calculateCartTotals([], false)).toEqual({
      subtotal: 0,
      discount: 0,
      shipping: 0,
      total: 0,
    });
  });

  it('uses the product sale price as the cart unit price', () => {
    expect(getUnitPrice({ ...product, price: 129.99, discount: 0.25 })).toBe(97.49);
  });

  it('accepts SAVE5 regardless of surrounding whitespace or letter case', () => {
    expect(isValidCoupon('save5')).toBe(true);
    expect(isValidCoupon(' SAVE5 ')).toBe(true);
    expect(isValidCoupon('SAVE10')).toBe(false);
    expect(isValidCoupon('')).toBe(false);
  });
});

describe('cart item updates', () => {
  it('adds quantities to an existing product instead of duplicating it', () => {
    const initial: CartItem[] = [{ product, quantity: 2 }];
    const result = addProductToCart(initial, product, 3);

    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(5);
  });

  it('updates quantities and removes an item when set to zero', () => {
    const initial: CartItem[] = [{ product, quantity: 2 }];

    expect(updateCartQuantity(initial, product.productId, 4)[0].quantity).toBe(4);
    expect(updateCartQuantity(initial, product.productId, 0)).toEqual([]);
  });

  it('removes only the selected product', () => {
    const anotherProduct = { ...product, productId: 2, name: 'CatFlix' };
    const initial: CartItem[] = [
      { product, quantity: 1 },
      { product: anotherProduct, quantity: 2 },
    ];

    expect(removeCartItem(initial, product.productId)).toEqual([
      { product: anotherProduct, quantity: 2 },
    ]);
  });
});
