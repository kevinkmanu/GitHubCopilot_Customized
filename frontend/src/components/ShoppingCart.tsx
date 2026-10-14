import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import CartItemsTable from './CartItemsTable';
import OrderSummary from './OrderSummary';
import CouponInput from './CouponInput';

export default function ShoppingCart() {
  const navigate = useNavigate();
  const { cart, isLoading } = useCart();
  const { darkMode } = useTheme();

  const isEmpty = !cart || cart.items.length === 0;

  const handleCheckout = () => {
    if (!isEmpty) {
      navigate('/checkout');
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
              Shopping Cart
            </h1>
            {!isEmpty && (
              <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {cart!.items.length} {cart!.items.length === 1 ? 'item' : 'items'} in cart
              </p>
            )}
          </div>
          {!isEmpty && (
            <button
              onClick={() => navigate('/products')}
              className={`self-start sm:self-auto px-6 py-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-light'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Continue Shopping
            </button>
          )}
        </div>

        {isEmpty ? (
          <div className="max-w-2xl mx-auto">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-12 text-center shadow-lg`}>
              <svg
                className={`w-24 h-24 mx-auto mb-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                Your cart is empty
              </h2>
              <p className={`mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Start adding products to your cart to continue shopping.
              </p>
              <button
                onClick={() => navigate('/products')}
                className="px-8 py-3 bg-primary hover:bg-accent text-white rounded-lg font-medium transition-colors"
              >
                Browse Products
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              <CartItemsTable />

              {/* Update Cart Button */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => navigate('/products')}
                  className={`px-6 py-3 rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-light'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Continue Shopping
                </button>
                <button
                  disabled={isLoading}
                  className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                    isLoading
                      ? `${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'} cursor-not-allowed`
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isLoading ? 'Updating...' : 'Update Cart'}
                </button>
              </div>
            </div>

            {/* Sidebar: Summary and Coupon */}
            <div className="lg:col-span-1 space-y-6">
              {/* Coupon Section */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-md`}>
                <CouponInput />
              </div>

              {/* Order Summary */}
              <OrderSummary />

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isEmpty || isLoading}
                className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
                  isEmpty || isLoading
                    ? `${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-500'} cursor-not-allowed`
                    : 'bg-accent hover:bg-opacity-90 text-white'
                }`}
              >
                Proceed to Checkout
              </button>

              {/* Trust Badges */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md text-center`}>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mb-3`}>
                  Safe & Secure Checkout
                </p>
                <div className="flex justify-center gap-2">
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414L10 3.586l4.707 4.707a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
