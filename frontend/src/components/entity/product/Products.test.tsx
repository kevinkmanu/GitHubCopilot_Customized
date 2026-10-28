import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import axios from 'axios';
import Products from './Products';
import { ThemeProvider } from '../../../context/ThemeContext';

const products = [
  { productId: 1, name: 'Smart Feeder', description: 'Feeds cats on a schedule', price: 100, imgName: 'feeder.png', sku: 'F1', unit: 'each', supplierId: 1 },
  { productId: 2, name: 'Cat Tracker', description: 'Tracks your cat', price: 50, imgName: 'tracker.png', sku: 'T1', unit: 'each', supplierId: 1, discount: 0.1 },
  { productId: 3, name: 'Laser Toy', description: 'Chase the dot', price: 45, imgName: 'laser.png', sku: 'L1', unit: 'each', supplierId: 2 },
];

function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <span data-testid="search">{location.search}</span>
      <button onClick={() => navigate(-1)}>history back</button>
      <button onClick={() => navigate(1)}>history forward</button>
    </>
  );
}

function renderProducts(entry = '/products') {
  vi.spyOn(axios, 'get').mockImplementation(vi.fn().mockResolvedValue({ data: products }));
  render(
    <MemoryRouter initialEntries={[entry]}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider>
          <Probe />
          <Products />
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const names = () => screen.queryAllByRole('heading', { level: 3 }).map(h => h.textContent);
const urlSearch = () => screen.getByTestId('search').textContent;

describe('Products discovery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows all products, the result count and no clear button by default', async () => {
    renderProducts();
    expect(await screen.findByText('Smart Feeder')).toBeInTheDocument();
    expect(names()).toEqual(['Smart Feeder', 'Cat Tracker', 'Laser Toy']);
    expect(screen.getByRole('status')).toHaveTextContent('3 products found');
    expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('restores filters from the URL and preserves unrelated parameters', async () => {
    renderProducts('/products?q=cat&sale=1&sort=price-asc&utm=email');
    expect(await screen.findByText('Cat Tracker')).toBeInTheDocument();
    expect(names()).toEqual(['Cat Tracker']);
    expect(screen.getByLabelText('Search products')).toHaveValue('cat');
    expect(screen.getByLabelText('On sale only')).toBeChecked();
    expect(screen.getByLabelText('Sort by')).toHaveValue('price-asc');
    expect(urlSearch()).toContain('utm=email');
  });

  it('updates the URL for each filter and omits defaults', async () => {
    const user = userEvent.setup();
    renderProducts();
    await screen.findByText('Smart Feeder');

    await user.selectOptions(screen.getByLabelText('Sort by'), 'price-desc');
    expect(names()).toEqual(['Smart Feeder', 'Cat Tracker', 'Laser Toy']);
    await waitFor(() => expect(urlSearch()).toBe('?sort=price-desc'));

    await user.click(screen.getByLabelText('On sale only'));
    expect(names()).toEqual(['Cat Tracker']);
    await waitFor(() => expect(urlSearch()).toBe('?sale=1&sort=price-desc'));

    await user.click(screen.getByLabelText('On sale only'));
    await user.type(screen.getByLabelText('Min price ($)'), '45');
    await user.type(screen.getByLabelText('Max price ($)'), '45');
    expect(names()).toEqual(['Cat Tracker', 'Laser Toy']);
    await waitFor(() => expect(urlSearch()).toBe('?min=45&max=45&sort=price-desc'));

    await user.type(screen.getByLabelText('Search products'), 'laser');
    expect(names()).toEqual(['Laser Toy']);
    await waitFor(() => expect(urlSearch()).toBe('?q=laser&min=45&max=45&sort=price-desc'));
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('restores the previous state on browser back and forward', async () => {
    const user = userEvent.setup();
    renderProducts();
    await screen.findByText('Smart Feeder');

    await user.click(screen.getByLabelText('On sale only'));
    await waitFor(() => expect(urlSearch()).toBe('?sale=1'));
    expect(names()).toEqual(['Cat Tracker']);

    await user.click(screen.getByRole('button', { name: 'history back' }));
    await waitFor(() => expect(names()).toEqual(['Smart Feeder', 'Cat Tracker', 'Laser Toy']));
    expect(screen.getByLabelText('On sale only')).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'history forward' }));
    await waitFor(() => expect(names()).toEqual(['Cat Tracker']));
    expect(screen.getByLabelText('On sale only')).toBeChecked();
  });

  it('shows an empty state and clears everything, moving focus to the search box', async () => {
    const user = userEvent.setup();
    renderProducts('/products?q=zzz&sale=1&sort=name-asc');
    expect(await screen.findByText('No products match your filters')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('0 products found');

    const empty = screen.getByText('No products match your filters').parentElement!;
    await user.click(within(empty).getByRole('button', { name: 'Clear all filters' }));

    expect(names()).toEqual(['Smart Feeder', 'Cat Tracker', 'Laser Toy']);
    expect(screen.getByLabelText('Search products')).toHaveValue('');
    expect(screen.getByLabelText('Search products')).toHaveFocus();
    await waitFor(() => expect(urlSearch()).toBe(''));
  });

  it('rejects invalid prices with accessible messages and keeps them out of the URL', async () => {
    const user = userEvent.setup();
    renderProducts();
    await screen.findByText('Smart Feeder');
    const min = screen.getByLabelText('Min price ($)');
    const max = screen.getByLabelText('Max price ($)');

    await user.type(min, '-5');
    expect(min).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a price of 0 or more');
    expect(min).toHaveAccessibleDescription(/Enter a price of 0 or more/);
    expect(names()).toHaveLength(3);
    expect(urlSearch()).toBe('');

    await user.clear(min);
    await user.type(min, '80');
    await user.type(max, '20');
    expect(screen.getByRole('alert')).toHaveTextContent('Minimum price cannot exceed maximum price');
    expect(min).toHaveAccessibleDescription('Minimum price cannot exceed maximum price');
    expect(names()).toHaveLength(3);
    expect(urlSearch()).toBe('');

    await user.clear(max);
    await user.type(max, '120');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(names()).toEqual(['Smart Feeder']);
    await waitFor(() => expect(urlSearch()).toBe('?min=80&max=120'));
  });

  it('normalizes malformed URL parameters without crashing', async () => {
    renderProducts('/products?min=abc&max=-1&sale=yes&sort=nope&keep=1');
    expect(await screen.findByText('Smart Feeder')).toBeInTheDocument();
    expect(names()).toHaveLength(3);
    await waitFor(() => expect(urlSearch()).toBe('?keep=1'));
  });

  it('keeps product quantity controls working while filtering', async () => {
    const user = userEvent.setup();
    renderProducts();
    await screen.findByText('Smart Feeder');
    await user.click(screen.getByRole('button', { name: 'Increase quantity of Cat Tracker' }));
    await user.type(screen.getByLabelText('Search products'), 'laser');
    expect(names()).toEqual(['Laser Toy']);
    await user.clear(screen.getByLabelText('Search products'));
    expect(screen.getByLabelText('Quantity of Cat Tracker')).toHaveTextContent('1');
  });
});
