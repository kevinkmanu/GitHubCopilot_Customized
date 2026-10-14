import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { getUnitPrice } from '../../context/cartUtils';
import { useTheme } from '../../context/ThemeContext';

const currency = (amount: number) => `$${amount.toFixed(2)}`;

export default function Checkout() {
  const { items, totals, couponApplied } = useCart();
  const { darkMode } = useTheme();
  const panelClass = darkMode ? 'bg-gray-800 text-light' : 'bg-white text-gray-800';
  const mutedClass = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <section className={`min-h-screen pt-24 pb-16 px-4 transition-colors duration-300 ${darkMode ? 'bg-dark' : 'bg-gray-100'}`}>
      <div className="max-w-5xl mx-auto">
        <p className="text-primary font-semibold uppercase tracking-wider text-sm">Almost there</p>
        <h1 className={`text-3xl md:text-4xl font-bold mt-1 mb-8 ${darkMode ? 'text-light' : 'text-gray-900'}`}>Checkout Review</h1>
        {items.length === 0 ? (
          <div className={`${panelClass} rounded-2xl shadow p-10 text-center`}>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className={`${mutedClass} mb-6`}>Add products before reviewing your order.</p>
            <Link to="/products" className="inline-flex bg-primary hover:bg-accent text-white font-semibold rounded-lg px-6 py-3">Browse products</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
            <div className={`${panelClass} rounded-2xl shadow p-6 md:p-8`}>
              <h2 className="text-xl font-bold mb-5">Items in your order</h2>
              <ul className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {items.map(({ product, quantity }) => (
                  <li key={product.productId} className="flex items-center gap-4 py-4">
                    <div className={`w-16 h-16 rounded-lg flex-shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-2`}>
                      <img src={`/${product.imgName}`} alt={product.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className={`text-sm ${mutedClass}`}>Quantity: {quantity} × {currency(getUnitPrice(product))}</p>
                    </div>
                    <span className="font-semibold">{currency(getUnitPrice(product) * quantity)}</span>
                  </li>
                ))}
              </ul>
              <Link to="/cart" className="inline-flex mt-5 text-primary hover:underline font-medium">← Return to cart</Link>
            </div>
            <aside className={`${panelClass} rounded-2xl shadow p-6`}>
              <h2 className="text-xl font-bold mb-5">Order Summary</h2>
              <dl className={`space-y-3 border-b pb-5 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex justify-between gap-3"><dt className={mutedClass}>Subtotal</dt><dd>{currency(totals.subtotal)}</dd></div>
                <div className="flex justify-between gap-3"><dt className={mutedClass}>Discount{couponApplied ? ' (SAVE5)' : ''}</dt><dd>−{currency(totals.discount)}</dd></div>
                <div className="flex justify-between gap-3"><dt className={mutedClass}>Shipping</dt><dd>{currency(totals.shipping)}</dd></div>
              </dl>
              <div className="flex justify-between gap-3 py-5 font-bold text-lg">
                <span>Grand total</span><span className="text-primary">{currency(totals.total)}</span>
              </div>
              <div className={`rounded-xl p-4 text-sm ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                <p className="font-semibold mb-1">Review only</p>
                <p className={mutedClass}>Your cart and totals are ready. Payment and order placement are not available in this demo.</p>
              </div>
              <Link to="/products" className="block text-center mt-5 text-primary hover:underline font-medium">Continue shopping</Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
