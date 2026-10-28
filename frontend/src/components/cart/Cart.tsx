import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../api/config';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { AppliedCoupon, formatCurrency, lineTotal, parseQuantity } from '../../context/cartUtils';

interface QuantityEdit {
  text: string;
  value: number;
}

export default function Cart() {
  const { darkMode } = useTheme();
  const { items, coupon, totals, updateQuantities, removeItem, applyCoupon, removeCoupon } = useCart();
  const navigate = useNavigate();

  // Quantity edits stay local until "Update Cart" commits them.
  const [edits, setEdits] = useState<Record<number, QuantityEdit>>({});
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponPending, setCouponPending] = useState(false);

  const pendingQuantities = Object.fromEntries(
    items
      .filter(item => edits[item.productId] && edits[item.productId].value !== item.quantity)
      .map(item => [item.productId, edits[item.productId].value])
  );
  const hasPendingChanges = Object.keys(pendingQuantities).length > 0;

  const handleQuantityChange = (productId: number, quantity: number, text: string) => {
    setEdits(prev => ({
      ...prev,
      [productId]: { text, value: parseQuantity(text) ?? prev[productId]?.value ?? quantity },
    }));
  };

  // On blur, show the last valid quantity so empty or invalid input never lingers.
  const handleQuantityBlur = (productId: number) => {
    setEdits(prev => {
      const current = prev[productId];
      return current ? { ...prev, [productId]: { text: String(current.value), value: current.value } } : prev;
    });
  };

  const handleUpdateCart = () => {
    updateQuantities(pendingQuantities);
    setEdits({});
  };

  const handleRemove = (productId: number) => {
    removeItem(productId);
    setEdits(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleApplyCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = couponInput.trim();
    if (!code) {
      setCouponError('Enter a coupon code');
      return;
    }
    setCouponPending(true);
    setCouponError(null);
    try {
      const { data } = await axios.post<AppliedCoupon>(`${api.baseURL}${api.endpoints.coupons}/validate`, { code });
      applyCoupon({ code: data.code, discountRate: data.discountRate });
      setCouponInput('');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response && error.response.status < 500) {
        setCouponError(error.response.data?.error ?? 'Invalid coupon code');
      } else {
        setCouponError('Could not validate the coupon. Please try again.');
      }
    } finally {
      setCouponPending(false);
    }
  };

  const panel = `${darkMode ? 'bg-gray-800/80 border-gray-700 text-light' : 'bg-white border-gray-200 text-gray-800'} rounded-xl border shadow-lg transition-colors duration-300`;
  const divider = darkMode ? 'border-gray-700' : 'border-gray-200';
  const mutedText = darkMode ? 'text-gray-400' : 'text-gray-600';
  const accentText = darkMode ? 'text-primary' : 'text-green-700';
  const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
  const primaryButton = `rounded-full bg-gradient-to-r from-green-700 to-primary px-6 py-2 font-semibold text-white transition hover:brightness-110 ${focusRing} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100`;
  const cell = 'flex items-center justify-between gap-4 py-1 md:table-cell md:px-3 md:py-4 before:font-semibold before:content-[attr(data-label)] md:before:hidden';
  const headerCell = `px-3 py-4 text-lg font-bold border-b ${divider}`;

  const discountPercent = coupon ? Number((coupon.discountRate * 100).toFixed(2)) : 0;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4 transition-colors duration-300`}>
      <div className="mx-auto max-w-7xl">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'}`}>Shopping Cart</h1>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-label="Cart items" className={panel}>
            {items.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-xl font-semibold">Your cart is empty</p>
                <p className={`mt-2 ${mutedText}`}>Add some products to get started.</p>
                <Link
                  to="/products"
                  className={`mt-6 inline-block ${primaryButton}`}
                >
                  Browse products
                </Link>
              </div>
            ) : (
              <>
                <table role="table" className="block w-full text-center md:table">
                  <caption className="sr-only">Items in your cart</caption>
                  <thead role="rowgroup" className="hidden md:table-header-group">
                    <tr role="row">
                      <th role="columnheader" scope="col" className={headerCell}>S. No.</th>
                      <th role="columnheader" scope="col" className={headerCell}>Product Image</th>
                      <th role="columnheader" scope="col" className={headerCell}>Product Name</th>
                      <th role="columnheader" scope="col" className={headerCell}>Unit Price</th>
                      <th role="columnheader" scope="col" className={headerCell}>Quantity</th>
                      <th role="columnheader" scope="col" className={headerCell}>Total</th>
                      <th role="columnheader" scope="col" className={headerCell}>Remove</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup" className="block md:table-row-group">
                    {items.map((item, index) => (
                      <tr
                        key={item.productId}
                        role="row"
                        className={`block border-b p-4 md:table-row md:p-0 ${divider}`}
                      >
                        <td role="cell" data-label="S. No." className={`${cell} font-semibold`}>{index + 1}</td>
                        <td role="cell" className={cell}>
                          <img
                            src={`/${item.imgName}`}
                            alt={item.name}
                            className="mx-auto h-20 w-20 object-contain"
                          />
                        </td>
                        <td role="cell" data-label="Product Name" className={`${cell} font-semibold`}>{item.name}</td>
                        <td role="cell" data-label="Unit Price" className={cell}>{formatCurrency(item.unitPrice)}</td>
                        <td role="cell" data-label="Quantity" className={cell}>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={edits[item.productId]?.text ?? String(item.quantity)}
                            onChange={event => handleQuantityChange(item.productId, item.quantity, event.target.value)}
                            onBlur={() => handleQuantityBlur(item.productId)}
                            aria-label={`Quantity of ${item.name}`}
                            className={`w-16 rounded-lg border px-2 py-2 text-center ${focusRing} ${
                              darkMode ? 'border-gray-600 bg-dark text-light' : 'border-gray-300 bg-white text-gray-800'
                            }`}
                          />
                        </td>
                        <td role="cell" data-label="Total" className={`${cell} font-semibold`}>
                          {formatCurrency(lineTotal(item))}
                        </td>
                        <td role="cell" data-label="Remove" className={cell}>
                          <button
                            type="button"
                            onClick={() => handleRemove(item.productId)}
                            aria-label={`Remove ${item.name} from cart`}
                            className={`rounded p-2 transition hover:text-red-500 ${accentText} ${focusRing}`}
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                  {coupon ? (
                    <div className="flex items-center gap-3">
                      <p>
                        Coupon <strong>{coupon.code}</strong> applied ({discountPercent}% off)
                      </p>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        aria-label={`Remove coupon ${coupon.code}`}
                        className={`rounded text-sm font-semibold underline ${accentText} ${focusRing}`}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} noValidate className="flex flex-col gap-2">
                      <div className="flex">
                        <label htmlFor="coupon-code" className="sr-only">Coupon code</label>
                        <input
                          id="coupon-code"
                          type="text"
                          value={couponInput}
                          onChange={event => setCouponInput(event.target.value)}
                          placeholder="Coupon Code"
                          maxLength={32}
                          autoComplete="off"
                          aria-invalid={couponError ? true : undefined}
                          aria-describedby={couponError ? 'coupon-error' : undefined}
                          className={`min-w-0 flex-1 rounded-l-full border px-4 py-2 ${focusRing} ${
                            darkMode ? 'border-gray-600 bg-dark text-light' : 'border-gray-300 bg-white text-gray-800'
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={couponPending}
                          className={`rounded-r-full bg-primary px-4 py-2 font-semibold text-white transition hover:bg-accent ${focusRing} disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          Apply Coupon
                        </button>
                      </div>
                      {couponError && (
                        <p id="coupon-error" role="alert" className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{couponError}</p>
                      )}
                    </form>
                  )}
                  <button
                    type="button"
                    onClick={handleUpdateCart}
                    disabled={!hasPendingChanges}
                    className={primaryButton}
                  >
                    Update Cart
                  </button>
                </div>
              </>
            )}
          </section>

          <aside aria-labelledby="order-summary-heading" className={panel}>
            <h2 id="order-summary-heading" className="px-6 py-5 text-center text-2xl font-bold">Order Summary</h2>
            <dl className={`border-t ${divider}`}>
              <div className={`flex justify-between border-b px-6 py-3 ${divider}`}>
                <dt className="font-semibold">Subtotal</dt>
                <dd>{formatCurrency(totals.subtotal)}</dd>
              </div>
              <div className={`flex justify-between border-b px-6 py-3 ${divider}`}>
                <dt className="font-semibold">{coupon ? `Discount (${discountPercent}%)` : 'Discount'}</dt>
                <dd>{totals.discount > 0 ? `-${formatCurrency(totals.discount)}` : formatCurrency(0)}</dd>
              </div>
              <div className={`flex justify-between border-b px-6 py-3 ${divider}`}>
                <dt className="font-semibold">Shipping</dt>
                <dd>{formatCurrency(totals.shipping)}</dd>
              </div>
              <div className="flex justify-between px-6 py-3">
                <dt className="font-bold">Grand Total</dt>
                <dd className="font-bold" aria-live="polite">{formatCurrency(totals.grandTotal)}</dd>
              </div>
            </dl>
            <div className="p-6">
              <button
                type="button"
                disabled={items.length === 0}
                onClick={() => navigate('/checkout')}
                className={`w-full ${primaryButton}`}
              >
                Proceed To Checkout
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
