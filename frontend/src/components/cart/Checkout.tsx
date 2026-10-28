import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../context/cartUtils';

// Placeholder until the checkout flow is built.
export default function Checkout() {
  const { darkMode } = useTheme();
  const { totals } = useCart();

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark text-light' : 'bg-gray-100 text-gray-800'} pt-20 px-4 transition-colors duration-300`}>
      <div className="mx-auto max-w-3xl py-10 text-center">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="mt-4">Checkout is not available yet. Your order total is {formatCurrency(totals.grandTotal)}.</p>
        <Link to="/cart" className={`mt-6 inline-block font-semibold underline ${darkMode ? 'text-primary' : 'text-green-700'}`}>Back to cart</Link>
      </div>
    </div>
  );
}
