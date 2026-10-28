export type SortKey = 'default' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

export interface DiscoveryProduct {
  productId: number;
  name: string;
  description?: string;
  price: number;
  discount?: number;
}

export interface DiscoveryFilters {
  search: string;
  min: string;
  max: string;
  sale: boolean;
  sort: SortKey;
}

export interface PriceErrors {
  min?: string;
  max?: string;
  range?: string;
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'price-asc', label: 'Price low to high' },
  { value: 'price-desc', label: 'Price high to low' },
];

export const DEFAULT_FILTERS: DiscoveryFilters = { search: '', min: '', max: '', sale: false, sort: 'default' };
export const MAX_SEARCH_LENGTH = 100;
export const PRICE_FORMAT_ERROR = 'Enter a price of 0 or more with up to 2 decimal places.';
export const PRICE_RANGE_ERROR = 'Minimum price cannot exceed maximum price';

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;
const FILTER_PARAM_KEYS = ['q', 'min', 'max', 'sale', 'sort'] as const;
const SORT_KEYS = SORT_OPTIONS.map(option => option.value);

export function validatePrices(min: string, max: string): PriceErrors {
  const errors: PriceErrors = {};
  const minValue = min.trim();
  const maxValue = max.trim();
  if (minValue && !PRICE_PATTERN.test(minValue)) errors.min = PRICE_FORMAT_ERROR;
  if (maxValue && !PRICE_PATTERN.test(maxValue)) errors.max = PRICE_FORMAT_ERROR;
  if (!errors.min && !errors.max && minValue && maxValue && Number(minValue) > Number(maxValue)) {
    errors.range = PRICE_RANGE_ERROR;
  }
  return errors;
}

export function hasPriceErrors(errors: PriceErrors): boolean {
  return Boolean(errors.min || errors.max || errors.range);
}

export function hasActiveFilters(filters: DiscoveryFilters): boolean {
  return Boolean(
    filters.search.trim() || filters.min.trim() || filters.max.trim() || filters.sale || filters.sort !== 'default'
  );
}

// Invalid or inconsistent URL values fall back to defaults instead of throwing.
export function parseFilters(params: URLSearchParams): DiscoveryFilters {
  const priceParam = (key: string) => {
    const value = (params.get(key) ?? '').trim();
    return PRICE_PATTERN.test(value) ? value : '';
  };
  const sortParam = params.get('sort') as SortKey | null;
  let min = priceParam('min');
  let max = priceParam('max');
  if (hasPriceErrors(validatePrices(min, max))) {
    min = '';
    max = '';
  }
  return {
    search: (params.get('q') ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
    min,
    max,
    sale: params.get('sale') === '1',
    sort: sortParam && SORT_KEYS.includes(sortParam) ? sortParam : 'default',
  };
}

// Defaults and invalid price values are omitted; unrelated params are preserved.
export function buildParams(current: URLSearchParams, filters: DiscoveryFilters): URLSearchParams {
  const next = new URLSearchParams(current);
  FILTER_PARAM_KEYS.forEach(key => next.delete(key));
  const search = filters.search.trim().slice(0, MAX_SEARCH_LENGTH);
  if (search) next.set('q', search);
  if (!hasPriceErrors(validatePrices(filters.min, filters.max))) {
    if (filters.min.trim()) next.set('min', filters.min.trim());
    if (filters.max.trim()) next.set('max', filters.max.trim());
  }
  if (filters.sale) next.set('sale', '1');
  if (filters.sort !== 'default') next.set('sort', filters.sort);
  return next;
}

export function sameFilterParams(a: URLSearchParams, b: URLSearchParams): boolean {
  return FILTER_PARAM_KEYS.every(key => a.get(key) === b.get(key));
}

export function sameFilters(a: DiscoveryFilters, b: DiscoveryFilters): boolean {
  return (
    a.search === b.search && a.min === b.min && a.max === b.max && a.sale === b.sale && a.sort === b.sort
  );
}

export function getEffectivePrice(product: DiscoveryProduct): number {
  return Math.round(product.price * (1 - (product.discount ?? 0)) * 100) / 100;
}

const compareNames = (a: DiscoveryProduct, b: DiscoveryProduct) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

export function filterAndSortProducts<T extends DiscoveryProduct>(products: T[], filters: DiscoveryFilters): T[] {
  const term = filters.search.trim().toLowerCase();
  const priceValid = !hasPriceErrors(validatePrices(filters.min, filters.max));
  const min = priceValid && filters.min.trim() ? Number(filters.min) : undefined;
  const max = priceValid && filters.max.trim() ? Number(filters.max) : undefined;

  const result = products.filter(product => {
    if (term && !product.name.toLowerCase().includes(term) && !(product.description ?? '').toLowerCase().includes(term)) {
      return false;
    }
    if (filters.sale && !((product.discount ?? 0) > 0)) return false;
    const price = getEffectivePrice(product);
    if (min !== undefined && price < min) return false;
    if (max !== undefined && price > max) return false;
    return true;
  });

  const byId = (a: DiscoveryProduct, b: DiscoveryProduct) => a.productId - b.productId;
  switch (filters.sort) {
    case 'name-asc':
      return result.sort((a, b) => compareNames(a, b) || byId(a, b));
    case 'name-desc':
      return result.sort((a, b) => compareNames(b, a) || byId(a, b));
    case 'price-asc':
      return result.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b) || compareNames(a, b) || byId(a, b));
    case 'price-desc':
      return result.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a) || compareNames(a, b) || byId(a, b));
    default:
      return result;
  }
}
