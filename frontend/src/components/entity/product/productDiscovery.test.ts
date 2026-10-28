import { describe, it, expect } from 'vitest';
import {
  buildParams,
  filterAndSortProducts,
  getEffectivePrice,
  parseFilters,
  validatePrices,
  DEFAULT_FILTERS,
  PRICE_RANGE_ERROR,
  type DiscoveryFilters,
  type DiscoveryProduct,
} from './productDiscovery';

const products: DiscoveryProduct[] = [
  { productId: 1, name: 'Smart Feeder', description: 'Feeds cats on a schedule', price: 100 },
  { productId: 2, name: 'Cat Tracker', description: 'Tracks your cat', price: 50, discount: 0.1 },
  { productId: 3, name: 'Laser Toy', description: 'Chase the dot', price: 45 },
  { productId: 4, name: 'Cozy Bed', price: 80, discount: 0.5 },
];

const ids = (list: DiscoveryProduct[]) => list.map(p => p.productId);
const withFilters = (patch: Partial<DiscoveryFilters>): DiscoveryFilters => ({ ...DEFAULT_FILTERS, ...patch });

describe('getEffectivePrice', () => {
  it('applies the discount and rounds to cents', () => {
    expect(getEffectivePrice(products[1])).toBe(45);
    expect(getEffectivePrice({ productId: 9, name: 'x', price: 9.99, discount: 0.15 })).toBe(8.49);
    expect(getEffectivePrice(products[0])).toBe(100);
  });
});

describe('filterAndSortProducts', () => {
  it('keeps API order by default', () => {
    expect(ids(filterAndSortProducts(products, DEFAULT_FILTERS))).toEqual([1, 2, 3, 4]);
  });

  it('searches name and description case-insensitively, tolerating a missing description', () => {
    expect(ids(filterAndSortProducts(products, withFilters({ search: 'CAT' })))).toEqual([1, 2]);
    expect(ids(filterAndSortProducts(products, withFilters({ search: '  cozy ' })))).toEqual([4]);
    expect(ids(filterAndSortProducts(products, withFilters({ search: 'dot' })))).toEqual([3]);
  });

  it('filters on the effective price with inclusive bounds', () => {
    expect(ids(filterAndSortProducts(products, withFilters({ min: '45', max: '45' })))).toEqual([2, 3]);
    expect(ids(filterAndSortProducts(products, withFilters({ min: '40.01' })))).toEqual([1, 2, 3]);
    expect(ids(filterAndSortProducts(products, withFilters({ max: '40' })))).toEqual([4]);
  });

  it('filters to discounted products only', () => {
    expect(ids(filterAndSortProducts(products, withFilters({ sale: true })))).toEqual([2, 4]);
    expect(ids(filterAndSortProducts([{ productId: 5, name: 'Z', price: 1, discount: 0 }], withFilters({ sale: true })))).toEqual([]);
  });

  it('combines all filters with AND', () => {
    expect(ids(filterAndSortProducts(products, withFilters({ search: 'cat', sale: true, max: '50' })))).toEqual([2]);
  });

  it('sorts by name and by effective price with deterministic ties', () => {
    expect(ids(filterAndSortProducts(products, withFilters({ sort: 'name-asc' })))).toEqual([2, 4, 3, 1]);
    expect(ids(filterAndSortProducts(products, withFilters({ sort: 'name-desc' })))).toEqual([1, 3, 4, 2]);
    // Cat Tracker (45) and Laser Toy (45) tie, so name A-Z decides.
    expect(ids(filterAndSortProducts(products, withFilters({ sort: 'price-asc' })))).toEqual([4, 2, 3, 1]);
    expect(ids(filterAndSortProducts(products, withFilters({ sort: 'price-desc' })))).toEqual([1, 2, 3, 4]);
  });

  it('ignores the price filter while the price inputs are invalid', () => {
    expect(ids(filterAndSortProducts(products, withFilters({ min: '90', max: '10' })))).toEqual([1, 2, 3, 4]);
    expect(ids(filterAndSortProducts(products, withFilters({ min: 'abc' })))).toEqual([1, 2, 3, 4]);
  });

  it('does not mutate the input array', () => {
    const copy = [...products];
    filterAndSortProducts(products, withFilters({ sort: 'price-desc' }));
    expect(products).toEqual(copy);
  });
});

describe('validatePrices', () => {
  it('accepts empty and non-negative values with up to two decimals', () => {
    expect(validatePrices('', '')).toEqual({});
    expect(validatePrices('0', '10.5')).toEqual({});
    expect(validatePrices('10', '10')).toEqual({});
  });

  it('rejects negatives, letters and extra decimals', () => {
    expect(validatePrices('-1', '').min).toBeDefined();
    expect(validatePrices('', 'abc').max).toBeDefined();
    expect(validatePrices('1.234', '').min).toBeDefined();
    expect(validatePrices('1e3', '').min).toBeDefined();
  });

  it('rejects a minimum above the maximum', () => {
    expect(validatePrices('20', '10').range).toBe(PRICE_RANGE_ERROR);
  });
});

describe('parseFilters / buildParams', () => {
  it('round-trips valid state and omits defaults', () => {
    const state = withFilters({ search: 'cat', min: '10', max: '99.5', sale: true, sort: 'price-asc' });
    const params = buildParams(new URLSearchParams(), state);
    expect(params.toString()).toBe('q=cat&min=10&max=99.5&sale=1&sort=price-asc');
    expect(parseFilters(params)).toEqual(state);
    expect(buildParams(new URLSearchParams(), DEFAULT_FILTERS).toString()).toBe('');
  });

  it('falls back to defaults for malformed parameters', () => {
    const parsed = parseFilters(new URLSearchParams('min=abc&max=-5&sale=true&sort=bogus&q=%E0%A4%A'));
    expect(parsed.min).toBe('');
    expect(parsed.max).toBe('');
    expect(parsed.sale).toBe(false);
    expect(parsed.sort).toBe('default');
  });

  it('drops both prices when the range is inverted', () => {
    const parsed = parseFilters(new URLSearchParams('min=50&max=10'));
    expect(parsed.min).toBe('');
    expect(parsed.max).toBe('');
  });

  it('caps the search text at 100 characters', () => {
    expect(parseFilters(new URLSearchParams({ q: 'a'.repeat(150) })).search).toHaveLength(100);
  });

  it('preserves unrelated parameters and does not write invalid prices', () => {
    const current = new URLSearchParams('utm=1&q=old&sort=name-asc');
    const next = buildParams(current, withFilters({ search: ' new ', min: '20', max: '10' }));
    expect(next.get('utm')).toBe('1');
    expect(next.get('q')).toBe('new');
    expect(next.has('min')).toBe(false);
    expect(next.has('max')).toBe(false);
    expect(next.has('sort')).toBe(false);
  });
});
