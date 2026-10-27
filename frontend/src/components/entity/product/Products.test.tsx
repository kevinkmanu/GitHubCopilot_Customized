// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '../../../context/ThemeContext';
import Products from './Products';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Augment the frontend's Vitest, not the API workspace's copy.
  interface Assertion<T> extends TestingLibraryMatchers<unknown, T> {}
}

const products = [
  { productId: 1, name: 'Zebra', description: 'Quiet companion', sku: 'CAT-Z', price: 100, discount: 0.25 },
  { productId: 2, name: 'Alpha', description: 'Quiet feeder', sku: 'CAT-A', price: 80 },
  { productId: 3, name: 'Beta', description: 'Quiet toy', sku: 'DOG-B', price: 150, discount: 0.5 },
  { productId: 4, name: 'Delta', description: 'Cozy bed', sku: 'CAT-D', price: 19.99, discount: 0.1 },
  { productId: 5, name: 'Gamma', description: 'Quiet mat', sku: 'CAT-G', price: 75, discount: 0 },
].map(product => ({ ...product, imgName: 'feeder.png', unit: 'each', supplierId: 1 }));

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <span data-testid="url">{location.search}</span>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
    </>
  );
}

function setup(query = '') {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData('products', products);
  return render(
    <MemoryRouter initialEntries={[`/products${query}`]}>
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <Products />
          <NavigationProbe />
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const names = () => screen.queryAllByRole('heading', { level: 3 }).map(node => node.textContent);
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('product discovery', () => {
  it('combines case-insensitive search, inclusive discounted prices, and discounted-only', () => {
    setup('?search=QUIET&minPrice=75&maxPrice=75&discountedOnly=true');
    expect(names()).toEqual(['Zebra', 'Beta']);
    expect(screen.getByRole('status')).toHaveTextContent('2 products found');
    change('Search products', 'cat-Z');
    expect(names()).toEqual(['Zebra']);
    change('Search products', 'zEbRa');
    expect(names()).toEqual(['Zebra']);
    fireEvent.click(screen.getByLabelText('Discounted only'));
    change('Search products', '');
    expect(names()).toEqual(['Zebra', 'Beta', 'Gamma']);
  });

  it('uses the displayed discounted price at fractional-cent boundaries', () => {
    setup('?minPrice=17.99&maxPrice=17.99');
    expect(names()).toEqual(['Delta']);
  });

  it('sorts by name and effective prices without mutating the original order', () => {
    setup();
    expect(names()).toEqual(['Zebra', 'Alpha', 'Beta', 'Delta', 'Gamma']);
    change('Sort by', 'name');
    expect(names()).toEqual(['Alpha', 'Beta', 'Delta', 'Gamma', 'Zebra']);
    change('Sort by', 'price-asc');
    expect(names()).toEqual(['Delta', 'Zebra', 'Beta', 'Gamma', 'Alpha']);
    change('Sort by', 'price-desc');
    expect(names()).toEqual(['Alpha', 'Zebra', 'Beta', 'Gamma', 'Delta']);
    change('Sort by', '');
    expect(names()).toEqual(['Zebra', 'Alpha', 'Beta', 'Delta', 'Gamma']);
    expect(products.map(product => product.name)).toEqual(names());
  });

  it('shows an empty state and resets discovery while retaining unrelated parameters', () => {
    setup('?campaign=summer&campaign=autumn&search=missing&minPrice=1&maxPrice=100&discountedOnly=true&sort=name');
    expect(screen.getByRole('status')).toHaveTextContent('0 products found');
    expect(screen.getByText(/No products match/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(names()).toHaveLength(5);
    expect(screen.getByTestId('url')).toHaveTextContent('?campaign=summer&campaign=autumn');
    expect(screen.getByLabelText('Minimum price')).toHaveValue('');
    expect(screen.getByLabelText('Discounted only')).not.toBeChecked();
    expect(screen.getByLabelText('Sort by')).toHaveValue('');
  });

  it.each(['abc', 'NaN', 'Infinity', '1e309', '-1', '0x10', ' '])(
    'handles malformed or negative price %j with accessible validation',
    value => {
      setup(`?minPrice=${encodeURIComponent(value)}&sort=unknown&discountedOnly=invalid`);
      expect(screen.getByRole('alert')).toHaveTextContent('Enter valid, non-negative prices');
      expect(screen.getByLabelText('Minimum price')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('Minimum price')).toHaveAccessibleDescription(/Enter valid/);
      expect(names()).toHaveLength(5);
      expect(screen.getByLabelText('Sort by')).toHaveValue('');
      expect(screen.getByLabelText('Discounted only')).not.toBeChecked();
      fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    }
  );

  it('rejects reversed bounds and negative maximums, and recovers when corrected', () => {
    setup('?minPrice=90&maxPrice=80');
    expect(screen.getByRole('alert')).toHaveTextContent('Minimum price must not exceed maximum price');
    change('Minimum price', '75');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(names()).toEqual(['Zebra', 'Alpha', 'Beta', 'Gamma']);
    change('Maximum price', '-1');
    expect(screen.getByRole('alert')).toHaveTextContent('non-negative');
    change('Minimum price', '0');
    change('Maximum price', '0');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(names()).toEqual([]);
  });

  it('stores controls in the URL and restores them on history navigation and remount', () => {
    const view = setup('?source=link');
    change('Search products', 'cat-z');
    change('Minimum price', '70');
    change('Maximum price', '80');
    fireEvent.click(screen.getByLabelText('Discounted only'));
    change('Sort by', 'price-desc');
    const query = screen.getByTestId('url').textContent!;
    expect(new URLSearchParams(query).get('source')).toBe('link');
    expect(new URLSearchParams(query).get('search')).toBe('cat-z');
    expect(new URLSearchParams(query).get('minPrice')).toBe('70');
    expect(new URLSearchParams(query).get('maxPrice')).toBe('80');
    expect(new URLSearchParams(query).get('discountedOnly')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Sort by')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(screen.getByLabelText('Sort by')).toHaveValue('price-desc');
    view.unmount();
    setup(query);
    expect(names()).toEqual(['Zebra']);
    expect(screen.getByLabelText('Minimum price')).toHaveValue('70');
    expect(screen.getByLabelText('Maximum price')).toHaveValue('80');
    expect(screen.getByLabelText('Discounted only')).toBeChecked();
    expect(screen.getByLabelText('Sort by')).toHaveValue('price-desc');
  });

  it('preserves product details, quantities across filtering, and Add to Cart behavior', () => {
    setup();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    expect(screen.getByRole('button', { name: 'Add 0 Zebra to cart' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Decrease quantity of Zebra'));
    expect(screen.getByLabelText('Quantity of Zebra')).toHaveTextContent('0');
    fireEvent.click(screen.getByLabelText('Increase quantity of Zebra'));
    change('Search products', 'Alpha');
    change('Search products', 'Zebra');
    expect(screen.getByLabelText('Quantity of Zebra')).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 Zebra to cart' }));
    expect(alert).toHaveBeenCalledWith('Added 1 items to cart');
    expect(screen.getByLabelText('Quantity of Zebra')).toHaveTextContent('0');
    fireEvent.click(screen.getByAltText('Zebra'));
    expect(screen.getByRole('heading', { level: 2, name: 'Zebra' })).toBeInTheDocument();
  });
});
