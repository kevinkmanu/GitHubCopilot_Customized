export interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  imgName: string;
  sku: string;
  unit: string;
  supplierId: number;
  stockLevel?: number;
  discount?: number;
}

export interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface AppliedCoupon extends Coupon {
  isValid: boolean;
  message?: string;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  discountPercentage?: number;
  shipping: number;
  grandTotal: number;
  appliedCoupon?: AppliedCoupon;
}

export interface Cart {
  cartId: string;
  items: CartItem[];
  summary: CartSummary;
  createdAt: string;
  updatedAt: string;
}

export interface CartContextType {
  cart: Cart | null;
  addItem: (product: Product, quantity: number) => void;
  updateItemQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  applyCoupon: (code: string) => Promise<void>;
  clearCart: () => void;
  isLoading: boolean;
  error: string | null;
}
