import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import Cart from './Cart';
import Checkout from './Checkout';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { CartProvider } from '../../context/CartContext';

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return { default: { ...actual.default, post: vi.fn(), get: vi.fn(), put: vi.fn(), isAxiosError: actual.default.isAxiosError } };
});

const mockedPost = vi.mocked(axios.post);

const stored = {
  items: [
    { productId: 1, name: 'Feeder', imgName: 'feeder.png', unitPrice: 100, quantity: 2 },
    { productId: 2, name: 'Collar', imgName: 'collar.png', unitPrice: 67, quantity: 1 },
  ],
  coupon: null,
};

// Mirrors the server: flat $10 shipping, SAVE5 = 5%, everything else invalid.
function fakeQuote(body: { items: { productId: number; quantity: number }[]; couponCode?: string }) {
  const prices: Record<number, number> = { 1: 100, 2: 67 };
  const subtotal = body.items.reduce((s, i) => s + prices[i.productId] * i.quantity, 0);
  if (body.couponCode && body.couponCode !== 'SAVE5') {
    return Promise.reject(Object.assign(new Error('bad'), { isAxiosError: true, response: { status: 400, data: { error: 'Invalid coupon code' } } }));
  }
  const percent = body.couponCode ? 5 : 0;
  const discount = Math.round(subtotal * percent) / 100;
  return Promise.resolve({
    data: { subtotal, discount, discountPercent: percent, couponCode: body.couponCode ?? null, shipping: body.items.length ? 10 : 0, grandTotal: subtotal - discount + (body.items.length ? 10 : 0) },
  });
}

function renderCart(cart: object | null = stored) {
  if (cart) localStorage.setItem('octocat-cart', JSON.stringify(cart));
  return render(
    <MemoryRouter initialEntries={['/cart']}>
      <AuthProvider>
        <ThemeProvider>
          <CartProvider>
            <Routes>
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/products" element={<div>Products page</div>} />
            </Routes>
          </CartProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Cart page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPost.mockImplementation((_url, body) => fakeQuote(body as never) as never);
  });

  it('renders rows with price, quantity, line total and labelled controls', () => {
    renderCart();
    const row = screen.getByRole('row', { name: /Feeder/ });
    expect(within(row).getByText('1')).toBeInTheDocument();
    expect(within(row).getByAltText('Feeder')).toBeInTheDocument();
    expect(within(row).getByText('$100.00')).toBeInTheDocument();
    expect(within(row).getByText('$200.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity of Feeder')).toHaveValue(2);
    expect(screen.getByRole('button', { name: 'Remove Feeder from cart' })).toBeInTheDocument();
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
  });

  it('enables Update Cart on quantity change and recalculates totals', async () => {
    const user = userEvent.setup();
    renderCart();
    const update = screen.getByRole('button', { name: 'Update Cart' });
    expect(update).toBeDisabled();

    const input = screen.getByLabelText('Quantity of Collar');
    await user.clear(input);
    await user.type(input, '3');
    expect(update).toBeEnabled();
    await user.click(update);

    expect(update).toBeDisabled();
    expect(screen.getByText('$201.00')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('grand-total')).toHaveTextContent('$411.00'));
  });

  it('keeps the previous valid quantity when input is invalid', async () => {
    const user = userEvent.setup();
    renderCart();
    const input = screen.getByLabelText('Quantity of Feeder');
    await user.clear(input);
    await user.type(input, '0');
    expect(screen.getByRole('button', { name: 'Update Cart' })).toBeDisabled();
    await user.tab();
    expect(input).toHaveValue(2);
    await user.clear(input);
    await user.tab();
    expect(input).toHaveValue(2);
    await user.type(input, '-');
    await user.tab();
    expect(input).toHaveValue(2);
    expect(screen.getByRole('button', { name: 'Update Cart' })).toBeDisabled();
  });

  it('removes an item and recalculates totals', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.click(screen.getByRole('button', { name: 'Remove Feeder from cart' }));
    expect(screen.queryByText('Feeder')).not.toBeInTheDocument();
    expect(screen.getByTestId('grand-total')).toHaveTextContent('$77.00');
  });

  it('shows the empty state with a continue-shopping link and disabled checkout', async () => {
    const user = userEvent.setup();
    renderCart({ items: [], coupon: null });
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Proceed To Checkout' })).toBeDisabled();
    await user.click(screen.getByRole('link', { name: 'Continue shopping' }));
    expect(screen.getByText('Products page')).toBeInTheDocument();
  });

  it('applies a valid coupon and shows the discount line', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.type(screen.getByLabelText('Coupon Code'), 'SAVE5');
    await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));
    expect(await screen.findByText('Discount (5%)')).toBeInTheDocument();
    expect(screen.getByText('-$13.35')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('grand-total')).toHaveTextContent('$263.65'));
  });

  it('shows an inline error for an invalid coupon and changes nothing', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.type(screen.getByLabelText('Coupon Code'), 'NOPE');
    await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid coupon code');
    expect(screen.queryByText(/Discount \(/)).not.toBeInTheDocument();
    expect(screen.getByTestId('grand-total')).toHaveTextContent('$277.00');
  });

  it('keeps only one coupon active at a time', async () => {
    const user = userEvent.setup();
    renderCart({ ...stored, coupon: { code: 'SAVE5', percent: 5 } });
    expect(screen.getAllByText(/Discount \(/)).toHaveLength(1);
    await user.type(screen.getByLabelText('Coupon Code'), 'NOPE');
    await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getAllByText(/Discount \(/)).toHaveLength(1);
    expect(screen.getByText('Discount (5%)')).toBeInTheDocument();
  });

  it('shows the summary lines and navigates to checkout with validated totals', async () => {
    const user = userEvent.setup();
    renderCart({ ...stored, coupon: { code: 'SAVE5', percent: 5 } });
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('Shipping')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Proceed To Checkout' }));
    expect(await screen.findByTestId('checkout-total')).toHaveTextContent('$263.65');
    expect(screen.getByText('Coupon: SAVE5 (5%)')).toBeInTheDocument();
  });

  it('persists the cart in local storage', async () => {
    const user = userEvent.setup();
    renderCart();
    await user.click(screen.getByRole('button', { name: 'Remove Feeder from cart' }));
    expect(JSON.parse(localStorage.getItem('octocat-cart') ?? '{}').items).toHaveLength(1);
  });
});
