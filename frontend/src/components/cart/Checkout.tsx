import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { CartItem, AppliedCoupon, CartTotals, formatCurrency } from '../../context/cartUtils';

interface CheckoutState {
  items: CartItem[];
  coupon: AppliedCoupon | null;
  totals: CartTotals;
}

export default function Checkout() {
  const { darkMode } = useTheme();
  const state = useLocation().state as CheckoutState | null;
  const text = darkMode ? 'text-light' : 'text-gray-800';

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-24 px-4`}>
      <div className={`max-w-3xl mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8 ${text}`}>
        <h1 className="text-3xl font-bold mb-4">Checkout</h1>
        {state ? (
          <>
            <ul className="mb-4">
              {state.items.map(i => (
                <li key={i.productId}>{i.quantity} × {i.name}</li>
              ))}
            </ul>
            {state.coupon && <p>Coupon: {state.coupon.code} ({state.coupon.percent}%)</p>}
            <p className="font-bold" data-testid="checkout-total">Grand Total: {formatCurrency(state.totals.grandTotal)}</p>
          </>
        ) : (
          <p>Your checkout is empty. <Link to="/cart" className="text-primary underline">Return to your cart</Link></p>
        )}
      </div>
    </div>
  );
}
