import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import Cart from './Cart';
import Checkout from './Checkout';
import { CartProvider } from '../../context/CartContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { CART_STORAGE_KEY, CartItem } from '../../context/cartUtils';

const threeItems: CartItem[] = [
  { productId: 1, name: 'Solar Panel', imgName: 'a.png', unitPrice: 89, quantity: 1 },
  { productId: 2, name: 'Solar Panel2', imgName: 'b.png', unitPrice: 89, quantity: 1 },
  { productId: 3, name: 'Euronet Solar Panel', imgName: 'c.png', unitPrice: 89, quantity: 1 },
];

const seedStorage = (items: CartItem[], coupon: { code: string; discountRate: number } | null = null) =>
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, coupon }));

const renderCart = () =>
  render(
    <MemoryRouter initialEntries={['/cart']}>
      <ThemeProvider>
        <CartProvider>
          <Routes>
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/products" element={<p>Products page</p>} />
          </Routes>
        </CartProvider>
      </ThemeProvider>
    </MemoryRouter>
  );

const summaryRow = (label: string) =>
  within(screen.getByRole('complementary', { name: 'Order Summary' })).getByText(label).parentElement!;

const quantityInput = (name: string) => screen.getByLabelText(`Quantity of ${name}`) as HTMLInputElement;

const apiError = (status: number, error: string) =>
  Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status, data: { error } } });

const post = vi.fn();

describe('Cart', () => {
  beforeEach(() => {
    post.mockReset();
    vi.spyOn(axios, 'post').mockImplementation(post);
    seedStorage(threeItems);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cart table', () => {
    it('shows serial number, image, name, unit price, quantity, line total and remove for each item', () => {
      renderCart();
      const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
      expect(rows).toHaveLength(3);

      const second = within(rows[1]);
      expect(second.getByText('2')).toBeInTheDocument();
      expect(second.getByRole('img', { name: 'Solar Panel2' })).toHaveAttribute('src', '/b.png');
      expect(second.getByText('Solar Panel2')).toBeInTheDocument();
      expect(second.getAllByText('$89.00')).toHaveLength(2); // unit price and line total
      expect(second.getByLabelText('Quantity of Solar Panel2')).toHaveValue('1');
      expect(second.getByRole('button', { name: 'Remove Solar Panel2 from cart' })).toBeInTheDocument();
    });

    it('applies quantity changes and recalculates only after Update Cart', async () => {
      const user = userEvent.setup();
      renderCart();
      const update = screen.getByRole('button', { name: 'Update Cart' });
      expect(update).toBeDisabled();

      await user.clear(quantityInput('Solar Panel'));
      await user.type(quantityInput('Solar Panel'), '3');
      expect(update).toBeEnabled();
      expect(summaryRow('Subtotal')).toHaveTextContent('$267.00');

      await user.click(update);
      expect(summaryRow('Subtotal')).toHaveTextContent('$445.00');
      expect(summaryRow('Grand Total')).toHaveTextContent('$455.00');
      const row = quantityInput('Solar Panel').closest('tr')!;
      expect(within(row).getAllByText('$267.00')).toHaveLength(1); // 3 x $89 line total
      expect(update).toBeDisabled();
    });

    it.each([
      ['empty', ''],
      ['zero', '0'],
      ['negative', '-2'],
      ['decimal', '1.5'],
      ['non-numeric', 'abc'],
    ])('reverts %s quantity input to the last valid value', async (_label, text) => {
      const user = userEvent.setup();
      renderCart();
      const input = quantityInput('Solar Panel');

      await user.clear(input);
      if (text) await user.type(input, text);
      await user.tab();

      expect(input).toHaveValue('1');
      expect(screen.getByRole('button', { name: 'Update Cart' })).toBeDisabled();
    });

    it('keeps the last valid edit when a later edit is invalid', async () => {
      const user = userEvent.setup();
      renderCart();
      const input = quantityInput('Solar Panel');

      await user.clear(input);
      await user.type(input, '4');
      await user.clear(input);
      await user.tab();

      expect(input).toHaveValue('4');
      expect(screen.getByRole('button', { name: 'Update Cart' })).toBeEnabled();
    });

    it('removes an item and updates the summary', async () => {
      const user = userEvent.setup();
      renderCart();

      await user.click(screen.getByRole('button', { name: 'Remove Solar Panel2 from cart' }));

      expect(screen.queryByText('Solar Panel2')).not.toBeInTheDocument();
      expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3); // header + 2 items
      expect(summaryRow('Subtotal')).toHaveTextContent('$178.00');
      expect(summaryRow('Grand Total')).toHaveTextContent('$188.00');
    });

    it('shows an empty state with a link to products and disables checkout once the cart is empty', async () => {
      const user = userEvent.setup();
      seedStorage([threeItems[0]]);
      renderCart();

      await user.click(screen.getByRole('button', { name: 'Remove Solar Panel from cart' }));

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute('href', '/products');
      expect(screen.getByRole('button', { name: 'Proceed To Checkout' })).toBeDisabled();
      expect(summaryRow('Shipping')).toHaveTextContent('$0.00');
      expect(summaryRow('Grand Total')).toHaveTextContent('$0.00');
    });
  });

  describe('order summary', () => {
    it('shows subtotal, discount, shipping and grand total with two decimals', () => {
      renderCart();
      expect(summaryRow('Subtotal')).toHaveTextContent('$267.00');
      expect(summaryRow('Discount')).toHaveTextContent('$0.00');
      expect(summaryRow('Shipping')).toHaveTextContent('$10.00');
      expect(summaryRow('Grand Total')).toHaveTextContent('$277.00');
    });

    it('proceeds to checkout when the cart has items', async () => {
      const user = userEvent.setup();
      renderCart();

      await user.click(screen.getByRole('button', { name: 'Proceed To Checkout' }));

      expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
      expect(screen.getByText(/Your order total is \$277\.00/)).toBeInTheDocument();
    });
  });

  describe('coupon', () => {
    it('applies a valid coupon and shows the discount in the summary', async () => {
      const user = userEvent.setup();
      post.mockResolvedValue({ data: { code: 'SAVE5', discountRate: 0.05 } });
      renderCart();

      await user.type(screen.getByLabelText('Coupon code'), 'save5');
      await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));

      expect(await screen.findByText(/applied \(5% off\)/)).toBeInTheDocument();
      expect(post).toHaveBeenCalledWith(expect.stringContaining('/api/coupons/validate'), { code: 'save5' });
      expect(summaryRow('Discount (5%)')).toHaveTextContent('-$13.35');
      expect(summaryRow('Grand Total')).toHaveTextContent('$263.65');
    });

    it('allows only one coupon at a time and lets it be removed', async () => {
      const user = userEvent.setup();
      post.mockResolvedValue({ data: { code: 'SAVE5', discountRate: 0.05 } });
      renderCart();

      await user.type(screen.getByLabelText('Coupon code'), 'SAVE5');
      await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));
      await screen.findByText(/applied/);

      expect(screen.queryByLabelText('Coupon code')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Apply Coupon' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Remove coupon SAVE5' }));
      expect(screen.getByLabelText('Coupon code')).toBeInTheDocument();
      expect(summaryRow('Discount')).toHaveTextContent('$0.00');
      expect(summaryRow('Grand Total')).toHaveTextContent('$277.00');
    });

    it.each([
      ['an invalid code', apiError(404, 'Invalid coupon code'), 'Invalid coupon code'],
      ['an expired code', apiError(410, 'This coupon has expired'), 'This coupon has expired'],
      ['a network failure', new Error('Network Error'), 'Could not validate the coupon. Please try again.'],
    ])('shows an inline error for %s and leaves totals unchanged', async (_label, failure, message) => {
      const user = userEvent.setup();
      post.mockRejectedValue(failure);
      renderCart();

      await user.type(screen.getByLabelText('Coupon code'), 'BAD');
      await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(summaryRow('Discount')).toHaveTextContent('$0.00');
      expect(summaryRow('Grand Total')).toHaveTextContent('$277.00');
    });

    it('asks for a code instead of calling the API when the field is empty', async () => {
      const user = userEvent.setup();
      renderCart();

      await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));

      expect(screen.getByRole('alert')).toHaveTextContent('Enter a coupon code');
      expect(post).not.toHaveBeenCalled();
    });
  });

  describe('persistence', () => {
    it('restores items, committed quantities and the coupon after a reload', async () => {
      const user = userEvent.setup();
      seedStorage(threeItems, { code: 'SAVE5', discountRate: 0.05 });
      const first = renderCart();

      await user.clear(quantityInput('Solar Panel'));
      await user.type(quantityInput('Solar Panel'), '2');
      await user.click(screen.getByRole('button', { name: 'Update Cart' }));
      first.unmount();

      renderCart();
      expect(quantityInput('Solar Panel')).toHaveValue('2');
      expect(summaryRow('Subtotal')).toHaveTextContent('$356.00');
      expect(summaryRow('Discount (5%)')).toHaveTextContent('-$17.80');
    });
  });
});
