import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import axios from 'axios';
import Navigation from '../Navigation';
import Products from '../entity/product/Products';
import { AuthProvider } from '../../context/AuthContext';
import { CartProvider } from '../../context/CartContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { CART_STORAGE_KEY } from '../../context/cartUtils';

const products = [
  { productId: 1, name: 'Smart Feeder', description: 'Feeds cats', price: 100, imgName: 'feeder.png', sku: 'F1', unit: 'each', supplierId: 1 },
  { productId: 2, name: 'Cat Tracker', description: 'Tracks cats', price: 50, imgName: 'tracker.png', sku: 'T1', unit: 'each', supplierId: 1, discount: 0.1 },
];

describe('Add to cart from the product list', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds products to the cart, updates the navigation badge and persists the cart', async () => {
    const user = userEvent.setup();
    vi.spyOn(axios, 'get').mockImplementation(vi.fn().mockResolvedValue({ data: products }));
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <AuthProvider>
            <ThemeProvider>
              <CartProvider>
                <Navigation />
                <Products />
              </CartProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Smart Feeder')).toBeInTheDocument();
    expect(screen.queryByTestId('cart-badge')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Increase quantity of Smart Feeder' }));
    await user.click(screen.getByRole('button', { name: 'Increase quantity of Smart Feeder' }));
    await user.click(screen.getByRole('button', { name: 'Add 2 Smart Feeder to cart' }));

    await user.click(screen.getByRole('button', { name: 'Increase quantity of Cat Tracker' }));
    await user.click(screen.getByRole('button', { name: 'Add 1 Cat Tracker to cart' }));

    expect(screen.getByTestId('cart-badge')).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: 'Shopping cart, 3 items' })).toHaveAttribute('href', '/cart');
    expect(screen.getByRole('status')).toHaveTextContent('Added 1 Cat Tracker to cart');

    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!);
    expect(stored.items).toEqual([
      { productId: 1, name: 'Smart Feeder', imgName: 'feeder.png', unitPrice: 100, quantity: 2 },
      // The 10% product discount is already applied to the cart unit price.
      { productId: 2, name: 'Cat Tracker', imgName: 'tracker.png', unitPrice: 45, quantity: 1 },
    ]);
  });
});
