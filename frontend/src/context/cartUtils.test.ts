import { describe, it, expect } from 'vitest';
import { calculateTotals, formatCurrency, lineTotal, parseQuantity } from './cartUtils';

const items = [
  { productId: 1, name: 'A', imgName: 'a.png', unitPrice: 100, quantity: 2 },
  { productId: 2, name: 'B', imgName: 'b.png', unitPrice: 67, quantity: 1 },
];

describe('cartUtils', () => {
  it('calculates line totals', () => {
    expect(lineTotal(items[0])).toBe(200);
  });

  it('calculates the Grand Total example: 267 - 13.35 + 10 = 263.65', () => {
    expect(calculateTotals(items, { code: 'SAVE5', percent: 5 })).toEqual({
      subtotal: 267,
      discount: 13.35,
      shipping: 10,
      grandTotal: 263.65,
    });
  });

  it('has no shipping or discount for an empty cart', () => {
    expect(calculateTotals([], null)).toEqual({ subtotal: 0, discount: 0, shipping: 0, grandTotal: 0 });
  });

  it('formats currency to two decimals', () => {
    expect(formatCurrency(263.6)).toBe('$263.60');
  });

  it.each([
    ['3', 3],
    ['1', 1],
    ['0', null],
    ['-2', null],
    ['1.5', null],
    ['abc', null],
    ['', null],
  ])('parseQuantity(%j) -> %s', (raw, expected) => {
    expect(parseQuantity(raw)).toBe(expected);
  });
});
