import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

export default function OrderSummary() {
  const { cart } = useCart();
  const { darkMode } = useTheme();

  if (!cart) {
    return null;
  }

  const { subtotal, discount, shipping, grandTotal, appliedCoupon } = cart.summary;

  return (
    <div
      className={`${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } rounded-lg p-6 shadow-md h-fit sticky top-20`}
    >
      <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
        Order Summary
      </h2>

      <div className="space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between">
          <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Subtotal</span>
          <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
            ${subtotal.toFixed(2)}
          </span>
        </div>

        {/* Discount */}
        <div className="flex justify-between">
          <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {appliedCoupon ? `Discount (${appliedCoupon.code})` : 'Discount'}
          </span>
          <span className={`font-medium ${discount > 0 ? 'text-green-500' : darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
            {discount > 0 ? '-' : ''}${discount.toFixed(2)}
          </span>
        </div>

        {/* Coupon Info */}
        {appliedCoupon && appliedCoupon.isValid && (
          <div className={`text-xs p-2 rounded ${darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>
            <p className="font-medium">✓ {appliedCoupon.code} applied</p>
            {appliedCoupon.discountType === 'percentage' && (
              <p>{appliedCoupon.discountValue}% off</p>
            )}
          </div>
        )}

        {/* Shipping */}
        <div className="flex justify-between">
          <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Shipping</span>
          <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
            ${shipping.toFixed(2)}
          </span>
        </div>

        {/* Separator */}
        <div className={`my-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'} border-t`}></div>

        {/* Grand Total */}
        <div className="flex justify-between">
          <span className={`text-lg font-bold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
            Grand Total
          </span>
          <span className="text-2xl font-bold text-primary">
            ${grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Savings Info */}
      {discount > 0 && (
        <div
          className={`mt-6 p-3 rounded-lg text-center ${
            darkMode ? 'bg-green-900 bg-opacity-20' : 'bg-green-50'
          }`}
        >
          <p className="text-green-600 font-medium text-sm">
            You're saving ${discount.toFixed(2)}!
          </p>
        </div>
      )}
    </div>
  );
}
