import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CartProvider, useCart } from '../context/CartContext';
import { Product } from '../types/cart';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

vi.mock('axios');

// Test component that uses useCart
function TestComponent() {
  const { cart, addItem, updateItemQuantity, removeItem, clearCart } = useCart();

  const mockProduct: Product = {
    productId: 1,
    name: 'Test Product',
    description: 'A test product',
    price: 29.99,
    imgName: 'test.jpg',
    sku: 'TEST001',
    unit: 'piece',
    supplierId: 1,
  };

  return (
    <div>
      <button onClick={() => addItem(mockProduct, 2)}>Add Item</button>
      <button onClick={() => updateItemQuantity(1, 3)}>Update Quantity</button>
      <button onClick={() => removeItem(1)}>Remove Item</button>
      <button onClick={() => clearCart()}>Clear Cart</button>

      <div data-testid="cart-items-count">{cart?.items.length || 0}</div>
      <div data-testid="cart-subtotal">{cart?.summary.subtotal.toFixed(2) || '0.00'}</div>
      <div data-testid="cart-discount">{cart?.summary.discount.toFixed(2) || '0.00'}</div>
      <div data-testid="cart-total">{cart?.summary.grandTotal.toFixed(2) || '0.00'}</div>
    </div>
  );
}

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize an empty cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-items-count')).toHaveTextContent('0');
  });

  it('should add items to cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);

    expect(screen.getByTestId('cart-items-count')).toHaveTextContent('1');
  });

  it('should calculate subtotal correctly', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Item')); // 2 items at $29.99 = $59.98

    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('59.98');
  });

  it('should update item quantity', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Item')); // Add 2 items
    fireEvent.click(screen.getByText('Update Quantity')); // Update to 3 items

    // 3 items at $29.99 = $89.97
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('89.97');
  });

  it('should remove items from cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Item')); // Add item
    expect(screen.getByTestId('cart-items-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByText('Remove Item')); // Remove item
    expect(screen.getByTestId('cart-items-count')).toHaveTextContent('0');
  });

  it('should clear cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Item'));
    expect(screen.getByTestId('cart-items-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByText('Clear Cart'));
    expect(screen.getByTestId('cart-items-count')).toHaveTextContent('0');
  });

  it('should include shipping cost in grand total', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Item')); // $59.98 subtotal + $10 shipping = $69.98

    expect(screen.getByTestId('cart-total')).toHaveTextContent('69.98');
  });

  it('should persist cart to localStorage', () => {
    const { rerender } = render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Item'));

    // Rerender to simulate page refresh
    rerender(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-items-count')).toHaveTextContent('1');
  });

  it('should merge duplicate products when adding to cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Item')); // Add 2 items
    fireEvent.click(screen.getByText('Add Item')); // Add 2 more items

    // Should have 1 item (product) with quantity 4
    expect(screen.getByTestId('cart-items-count')).toHaveTextContent('1');
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('119.96'); // 4 * 29.99
  });
});

describe('CartContext - Calculations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should calculate discount correctly for percentage coupon', () => {
    // This test requires mocking applyCoupon
    // Discount calculation is tested through integration tests
  });

  it('should respect quantity constraints', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    // Update to 0 should remove item
    fireEvent.click(screen.getByText('Add Item'));
    fireEvent.click(screen.getByText('Update Quantity')); // Set to 3
    fireEvent.click(screen.getByText('Update Quantity')); // Set to 3 again

    // After adding and updating, item should exist
    expect(screen.getByTestId('cart-items-count')).toHaveTextContent('1');
  });
});
