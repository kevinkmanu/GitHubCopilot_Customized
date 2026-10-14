import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../api/config';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { calculateTotals, CartTotals, formatCurrency, lineTotal, parseQuantity } from '../../context/cartUtils';

interface QuoteResponse extends CartTotals {
  discountPercent: number;
  couponCode: string | null;
}

const quoteUrl = () => `${api.baseURL}${api.endpoints.cart}/quote`;

const toRequestItems = (items: { productId: number; quantity: number }[]) =>
  items.map(({ productId, quantity }) => ({ productId, quantity }));

export default function Cart() {
  const { items, coupon, updateQuantities, removeItem, applyCoupon } = useCart();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [serverTotals, setServerTotals] = useState<{ key: string; totals: CartTotals } | null>(null);

  const cartKey = JSON.stringify([toRequestItems(items), coupon?.code ?? null]);
  const hasPendingChanges = items.some(i => {
    const draft = parseQuantity(drafts[i.productId] ?? '');
    return draft !== null && draft !== i.quantity;
  });

  // The server quote is authoritative; the local estimate keeps the summary instant.
  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    axios
      .post<QuoteResponse>(quoteUrl(), { items: toRequestItems(items), couponCode: coupon?.code })
      .then(({ data }) => {
        if (!cancelled) {
          setServerTotals({
            key: cartKey,
            totals: { subtotal: data.subtotal, discount: data.discount, shipping: data.shipping, grandTotal: data.grandTotal },
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // cartKey fully describes the items and coupon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  const totals = useMemo(
    () => (serverTotals && serverTotals.key === cartKey ? serverTotals.totals : calculateTotals(items, coupon)),
    [serverTotals, cartKey, items, coupon]
  );

  const handleQuantityChange = (productId: number, raw: string) => {
    // Digits only while typing; an invalid final value reverts on blur.
    if (!/^\d*$/.test(raw)) return;
    setDrafts(prev => ({ ...prev, [productId]: raw }));
  };

  const handleQuantityBlur = (productId: number) => {
    if (parseQuantity(drafts[productId] ?? '') !== null) return;
    setDrafts(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleUpdateCart = () => {
    const quantities: Record<number, number> = {};
    items.forEach(i => {
      const quantity = parseQuantity(drafts[i.productId] ?? '');
      if (quantity !== null) quantities[i.productId] = quantity;
    });
    updateQuantities(quantities);
    setDrafts({});
  };

  const handleRemove = (productId: number) => {
    removeItem(productId);
    setDrafts(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleApplyCoupon = async (e: FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim();
    if (!code) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setApplying(true);
    try {
      const { data } = await axios.post<QuoteResponse>(quoteUrl(), { items: toRequestItems(items), couponCode: code });
      applyCoupon({ code: data.couponCode ?? code, percent: data.discountPercent });
      setCouponError('');
      setCouponInput('');
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
      setCouponError(message ?? 'Unable to apply coupon. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const handleCheckout = async () => {
    try {
      const { data } = await axios.post<QuoteResponse>(quoteUrl(), { items: toRequestItems(items), couponCode: coupon?.code });
      navigate('/checkout', { state: { items, coupon, totals: data } });
    } catch {
      setCheckoutError('We could not validate your cart. Please try again.');
    }
  };

  const text = darkMode ? 'text-light' : 'text-gray-800';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-600';
  const card = darkMode ? 'bg-gray-800' : 'bg-white';
  const border = darkMode ? 'border-gray-700' : 'border-gray-200';
  const inputClass = `${darkMode ? 'bg-gray-700 text-light border-gray-600' : 'bg-white text-gray-800 border-gray-300'} rounded-md border px-2 py-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none`;

  if (items.length === 0) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-24 px-4`}>
        <div className={`max-w-3xl mx-auto ${card} rounded-lg shadow-lg p-8 text-center`}>
          <h1 className={`text-3xl font-bold ${text} mb-4`}>Shopping Cart</h1>
          <p className={`${muted} mb-6`}>Your cart is empty</p>
          <Link to="/products" className="bg-primary hover:bg-accent text-white px-6 py-2 rounded-md font-medium transition-colors">
            Continue shopping
          </Link>
          <div className="mt-8">
            <button type="button" disabled className="px-6 py-2 rounded-md bg-gray-200 text-gray-500 cursor-not-allowed">
              Proceed To Checkout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-24 pb-16 px-4`}>
      <div className="max-w-7xl mx-auto">
        <h1 className={`text-3xl font-bold ${text} mb-6`}>Shopping Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className={`${card} rounded-lg shadow-lg overflow-x-auto`}>
              <table className="w-full text-left">
                <thead className={`${muted} text-sm border-b ${border}`}>
                  <tr>
                    <th scope="col" className="p-3">S. No.</th>
                    <th scope="col" className="p-3">Image</th>
                    <th scope="col" className="p-3">Product</th>
                    <th scope="col" className="p-3">Price</th>
                    <th scope="col" className="p-3">Quantity</th>
                    <th scope="col" className="p-3">Total</th>
                    <th scope="col" className="p-3"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.productId} className={`border-b ${border} ${text}`}>
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">
                        <img src={`/${item.imgName}`} alt={item.name} className="h-16 w-16 object-contain" />
                      </td>
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          className={`${inputClass} w-20`}
                          value={drafts[item.productId] ?? String(item.quantity)}
                          onChange={e => handleQuantityChange(item.productId, e.target.value)}
                          onBlur={() => handleQuantityBlur(item.productId)}
                          aria-label={`Quantity of ${item.name}`}
                        />
                      </td>
                      <td className="p-3 font-semibold">{formatCurrency(lineTotal(item))}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleRemove(item.productId)}
                          aria-label={`Remove ${item.name} from cart`}
                          className="p-2 text-red-500 hover:text-red-600 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <form onSubmit={handleApplyCoupon} className="flex flex-col gap-1" noValidate>
                <div className="flex gap-2">
                  <label htmlFor="coupon-code" className="sr-only">Coupon Code</label>
                  <input
                    id="coupon-code"
                    type="text"
                    placeholder="Coupon Code"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value)}
                    className={`${inputClass} py-2`}
                    aria-invalid={couponError ? true : undefined}
                    aria-describedby={couponError ? 'coupon-error' : undefined}
                  />
                  <button type="submit" disabled={applying} className="bg-primary hover:bg-accent text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-60">
                    Apply Coupon
                  </button>
                </div>
                {couponError && (
                  <p id="coupon-error" role="alert" className="text-red-500 text-sm">{couponError}</p>
                )}
              </form>
              <button
                type="button"
                onClick={handleUpdateCart}
                disabled={!hasPendingChanges}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${hasPendingChanges ? 'bg-primary hover:bg-accent text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
              >
                Update Cart
              </button>
            </div>
          </div>

          <aside className={`${card} rounded-lg shadow-lg p-6 h-fit`} aria-labelledby="order-summary-heading">
            <h2 id="order-summary-heading" className={`text-xl font-bold ${text} mb-4`}>Order Summary</h2>
            <dl className={`space-y-3 ${text}`}>
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatCurrency(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Discount{coupon ? ` (${coupon.percent}%)` : ''}</dt>
                <dd>{totals.discount > 0 ? `-${formatCurrency(totals.discount)}` : formatCurrency(0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd>{formatCurrency(totals.shipping)}</dd>
              </div>
              <div className={`flex justify-between font-bold text-lg border-t ${border} pt-3`}>
                <dt>Grand Total</dt>
                <dd data-testid="grand-total">{formatCurrency(totals.grandTotal)}</dd>
              </div>
            </dl>
            {checkoutError && <p role="alert" className="text-red-500 text-sm mt-3">{checkoutError}</p>}
            <button
              type="button"
              onClick={handleCheckout}
              className="mt-6 w-full bg-primary hover:bg-accent text-white py-3 rounded-md font-semibold transition-colors"
            >
              Proceed To Checkout
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
