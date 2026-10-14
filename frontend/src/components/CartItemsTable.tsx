import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';

export default function CartItemsTable() {
  const { cart, updateItemQuantity, removeItem } = useCart();
  const { darkMode } = useTheme();

  if (!cart || cart.items.length === 0) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-8 text-center shadow-md`}>
        <svg
          className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-lg`}>Your cart is empty</p>
        <p className={`${darkMode ? 'text-gray-500' : 'text-gray-500'} text-sm mt-2`}>
          Add some products from the store to get started
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden shadow-md`}
      >
        <thead>
          <tr className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
            <th className={`px-6 py-3 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              S.N.
            </th>
            <th className={`px-6 py-3 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Product
            </th>
            <th className={`px-6 py-3 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Price
            </th>
            <th className={`px-6 py-3 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Quantity
            </th>
            <th className={`px-6 py-3 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Total
            </th>
            <th className={`px-6 py-3 text-center text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item, index) => (
            <tr
              key={item.productId}
              className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} transition-colors duration-200`}
            >
              <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {index + 1}
              </td>
              <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                <div className="flex items-center gap-3">
                  <img
                    src={`/${item.product.imgName}`}
                    alt={item.product.name}
                    className="w-12 h-12 object-contain rounded"
                  />
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {item.product.sku}
                    </p>
                  </div>
                </div>
              </td>
              <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                ${item.product.price.toFixed(2)}
              </td>
              <td className="px-6 py-4">
                <div className={`flex items-center gap-2 w-24 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg p-1`}>
                  <button
                    onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                    className={`flex-1 text-center py-1 rounded hover:bg-primary hover:text-white transition-colors ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                    aria-label={`Decrease quantity of ${item.product.name}`}
                  >
                    −
                  </button>
                  <span
                    className={`flex-1 text-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}
                    aria-label={`Quantity: ${item.quantity}`}
                  >
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                    className={`flex-1 text-center py-1 rounded hover:bg-primary hover:text-white transition-colors ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                    aria-label={`Increase quantity of ${item.product.name}`}
                  >
                    +
                  </button>
                </div>
              </td>
              <td className={`px-6 py-4 text-sm font-bold ${darkMode ? 'text-primary' : 'text-primary'}`}>
                ${(item.product.price * item.quantity).toFixed(2)}
              </td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => removeItem(item.productId)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'text-red-400 hover:bg-red-500 hover:text-white'
                      : 'text-red-500 hover:bg-red-100'
                  }`}
                  aria-label={`Remove ${item.product.name} from cart`}
                  title="Remove from cart"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
