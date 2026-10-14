import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { getUnitPrice } from '../../context/cartUtils';
import { useTheme } from '../../context/ThemeContext';

const currency = (amount: number) => `$${amount.toFixed(2)}`;

export default function Cart() {
  const { items, totals, couponApplied, updateQuantity, removeItem, applyCoupon } = useCart();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, number>>({});
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [cartMessage, setCartMessage] = useState('');

  const panelClass = darkMode ? 'bg-gray-800 text-light' : 'bg-white text-gray-800';
  const mutedClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  const updateCart = () => {
    items.forEach(({ product, quantity }) => {
      const updatedQuantity = quantityDrafts[product.productId];
      if (updatedQuantity !== undefined) {
        updateQuantity(product.productId, updatedQuantity);
      } else {
        updateQuantity(product.productId, quantity);
      }
    });
    setQuantityDrafts({});
    setCartMessage('Cart updated. Your order totals are current.');
  };

  const handleCheckout = () => {
    updateCart();
    navigate('/checkout');
  };

  const handleApplyCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (applyCoupon(couponCode)) {
      setCouponMessage('SAVE5 applied: 5% off your subtotal.');
    } else {
      setCouponMessage('That coupon code is not valid. Try SAVE5.');
    }
  };

  return (
    <section className={`min-h-screen pt-24 pb-16 px-4 transition-colors duration-300 ${darkMode ? 'bg-dark' : 'bg-gray-100'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <p className="text-primary font-semibold uppercase tracking-wider text-sm">Your shopping bag</p>
            <h1 className={`text-3xl md:text-4xl font-bold mt-1 ${darkMode ? 'text-light' : 'text-gray-900'}`}>Shopping Cart</h1>
          </div>
          <Link to="/products" className="text-primary hover:underline font-medium">Continue shopping</Link>
        </div>

        {items.length === 0 ? (
          <div className={`${panelClass} rounded-2xl shadow p-10 md:p-16 text-center`}>
            <div className="text-5xl mb-4" aria-hidden="true">🛒</div>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className={`${mutedClass} mb-6`}>Find something clever for your favorite cat.</p>
            <Link to="/products" className="inline-flex bg-primary hover:bg-accent text-white font-semibold rounded-lg px-6 py-3">Browse products</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
            <div className={`${panelClass} rounded-2xl shadow overflow-hidden`}>
              <div className={`hidden md:grid grid-cols-[minmax(0,1fr)_120px_110px_110px_44px] gap-4 px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} text-xs font-semibold uppercase tracking-wider ${mutedClass}`}>
                <span>Product</span><span>Price</span><span>Quantity</span><span className="text-right">Total</span><span />
              </div>
              <ul className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {items.map(({ product, quantity }) => {
                  const displayedQuantity = quantityDrafts[product.productId] ?? quantity;
                  return (
                  <li key={product.productId} className="grid md:grid-cols-[minmax(0,1fr)_120px_110px_110px_44px] gap-4 md:items-center px-5 md:px-6 py-5">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-20 h-20 rounded-xl flex-shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-2`}>
                        <img src={`/${product.imgName}`} alt={product.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-lg leading-tight">{product.name}</h2>
                        <p className={`text-sm ${mutedClass} mt-1`}>{product.unit}</p>
                      </div>
                    </div>
                    <div>
                      <span className="md:hidden text-xs uppercase tracking-wide block mb-1">Price</span>
                      <span>{currency(getUnitPrice(product))}</span>
                    </div>
                    <label className="flex items-center gap-2">
                      <span className="md:hidden text-xs uppercase tracking-wide">Qty</span>
                      <input
                        aria-label={`Quantity of ${product.name}`}
                        type="number"
                        min="1"
                        step="1"
                        value={displayedQuantity}
                        onChange={event => {
                          const nextQuantity = Number(event.target.value);
                          if (Number.isInteger(nextQuantity) && nextQuantity >= 1) {
                            setQuantityDrafts(current => ({ ...current, [product.productId]: nextQuantity }));
                            setCartMessage('');
                          }
                        }}
                        className={`w-20 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${darkMode ? 'bg-gray-900 border-gray-600 text-light' : 'bg-white border-gray-300'}`}
                      />
                    </label>
                    <div className="md:text-right">
                      <span className="md:hidden text-xs uppercase tracking-wide block mb-1">Line total</span>
                      <span className="font-semibold">{currency(getUnitPrice(product) * displayedQuantity)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removeItem(product.productId);
                        setQuantityDrafts(current => {
                          const next = { ...current };
                          delete next[product.productId];
                          return next;
                        });
                      }}
                      aria-label={`Remove ${product.name} from cart`}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-red-500 transition-colors`}
                    >
                      <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12m-10 0 .7 13h6.6L16 7M9 7V4h6v3m-4 4v5m2-5v5" />
                      </svg>
                    </button>
                  </li>
                  );
                })}
              </ul>
              <div className={`flex flex-wrap items-center justify-between gap-3 px-5 md:px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p aria-live="polite" className={`text-sm ${mutedClass}`}>{cartMessage}</p>
                <button
                  type="button"
                  onClick={updateCart}
                  className={`border rounded-lg px-5 py-2 font-semibold transition-colors ${darkMode ? 'border-gray-600 hover:border-primary hover:text-primary' : 'border-gray-300 hover:border-primary hover:text-primary'}`}
                >
                  Update Cart
                </button>
              </div>
            </div>

            <aside className={`${panelClass} rounded-2xl shadow p-6 md:p-7`}>
              <h2 className="text-xl font-bold mb-5">Order Summary</h2>
              <form onSubmit={handleApplyCoupon} className="mb-6">
                <label htmlFor="coupon-code" className={`block text-sm font-medium mb-2 ${mutedClass}`}>Coupon code</label>
                <div className="flex gap-2">
                  <input
                    id="coupon-code"
                    type="text"
                    value={couponCode}
                    onChange={event => setCouponCode(event.target.value)}
                    placeholder="Enter code"
                    className={`min-w-0 flex-1 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${darkMode ? 'bg-gray-900 border-gray-600 text-light placeholder:text-gray-500' : 'bg-white border-gray-300'}`}
                  />
                  <button type="submit" className="bg-gray-900 hover:bg-gray-700 text-white rounded-lg px-4 py-2 font-semibold">Apply Coupon</button>
                </div>
                <p aria-live="polite" className={`text-sm mt-2 ${couponMessage.startsWith('That coupon') ? 'text-red-500' : couponApplied ? 'text-primary' : mutedClass}`}>
                  {couponMessage || (couponApplied ? 'SAVE5 is applied.' : 'Use SAVE5 for 5% off.')}
                </p>
              </form>
              <dl className={`space-y-3 border-t border-b py-5 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-between gap-4"><dt className={mutedClass}>Subtotal</dt><dd>{currency(totals.subtotal)}</dd></div>
                <div className="flex justify-between gap-4"><dt className={mutedClass}>Discount</dt><dd className={couponApplied ? 'text-primary' : ''}>−{currency(totals.discount)}</dd></div>
                <div className="flex justify-between gap-4"><dt className={mutedClass}>Shipping</dt><dd>{currency(totals.shipping)}</dd></div>
              </dl>
              <div className="flex justify-between items-baseline gap-4 py-5">
                <span className="font-bold text-lg">Grand total</span>
                <span className="font-bold text-2xl text-primary">{currency(totals.total)}</span>
              </div>
              <button type="button" onClick={handleCheckout} className="block w-full text-center bg-primary hover:bg-accent text-white font-bold rounded-lg px-5 py-3 transition-colors">
                Proceed to Checkout
              </button>
              <p className={`text-xs text-center mt-3 ${mutedClass}`}>Secure checkout review · No payment required yet</p>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
