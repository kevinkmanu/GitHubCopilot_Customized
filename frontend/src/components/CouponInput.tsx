import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

export default function CouponInput() {
  const [couponCode, setCouponCode] = useState('');
  const { cart, applyCoupon, isLoading, error } = useCart();
  const { darkMode } = useTheme();

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.trim()) {
      await applyCoupon(couponCode.trim());
      setCouponCode('');
    }
  };

  const appliedCode = cart?.summary.appliedCoupon?.code;

  return (
    <form onSubmit={handleApplyCoupon} className="space-y-3">
      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Have a coupon code?
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          disabled={isLoading || !!appliedCode}
          className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-light placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary'
              : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary'
          } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="Coupon code input"
          maxLength={20}
        />
        <button
          type="submit"
          disabled={!couponCode.trim() || isLoading || !!appliedCode}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            !couponCode.trim() || isLoading || appliedCode
              ? `${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'} cursor-not-allowed`
              : `bg-primary hover:bg-accent text-white`
          }`}
          aria-label="Apply coupon"
        >
          {isLoading ? 'Applying...' : 'Apply'}
        </button>
      </div>

      {/* Success Message */}
      {appliedCode && (
        <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>
          <p className="font-medium">✓ Coupon {appliedCode} applied successfully!</p>
        </div>
      )}

      {/* Error Message */}
      {error && !appliedCode && (
        <div className={`p-3 rounded-lg text-sm ${darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'}`}>
          <p className="font-medium">✗ {error}</p>
        </div>
      )}
    </form>
  );
}
