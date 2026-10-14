import { Product } from '../models/product';

export const FLAT_SHIPPING = 10;

export interface Coupon {
    code: string;
    percent: number;
    expiresAt?: string;
}

export const coupons: Coupon[] = [
    { code: 'SAVE5', percent: 5 },
    { code: 'SAVE10', percent: 10 },
    { code: 'EXPIRED20', percent: 20, expiresAt: '2020-01-01T00:00:00Z' },
];

export interface CartLineInput {
    productId: number;
    quantity: number;
}

export interface CartLine {
    productId: number;
    name: string;
    imgName: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
}

export interface CartQuote {
    items: CartLine[];
    couponCode: string | null;
    discountPercent: number;
    subtotal: number;
    discount: number;
    shipping: number;
    grandTotal: number;
}

export class CartValidationError extends Error {
    constructor(message: string, public field: 'items' | 'couponCode') {
        super(message);
    }
}

export const roundCents = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const effectiveUnitPrice = (product: Product): number =>
    roundCents(product.price * (1 - (product.discount ?? 0)));

export function findCoupon(code: string, now: Date = new Date()): Coupon {
    const coupon = coupons.find(c => c.code === code.trim().toUpperCase());
    if (!coupon) {
        throw new CartValidationError('Invalid coupon code', 'couponCode');
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) {
        throw new CartValidationError('This coupon has expired', 'couponCode');
    }
    return coupon;
}

// Totals are always derived from server-side product prices, never from client input.
export function calculateQuote(
    inputs: CartLineInput[],
    products: Product[],
    couponCode?: string | null,
    now: Date = new Date()
): CartQuote {
    if (!Array.isArray(inputs)) {
        throw new CartValidationError('items must be an array', 'items');
    }
    const merged = new Map<number, number>();
    for (const input of inputs) {
        if (!input || !Number.isInteger(input.productId) || !Number.isInteger(input.quantity) || input.quantity < 1) {
            throw new CartValidationError('Each item needs a productId and an integer quantity of at least 1', 'items');
        }
        merged.set(input.productId, (merged.get(input.productId) ?? 0) + input.quantity);
    }

    const items: CartLine[] = [];
    for (const [productId, quantity] of merged) {
        const product = products.find(p => p.productId === productId);
        if (!product) {
            throw new CartValidationError(`Product ${productId} not found`, 'items');
        }
        const unitPrice = effectiveUnitPrice(product);
        items.push({
            productId,
            name: product.name,
            imgName: product.imgName,
            unitPrice,
            quantity,
            lineTotal: roundCents(unitPrice * quantity),
        });
    }

    const coupon = couponCode ? findCoupon(couponCode, now) : null;
    const subtotal = roundCents(items.reduce((sum, i) => sum + i.lineTotal, 0));
    const discount = coupon ? roundCents(subtotal * coupon.percent / 100) : 0;
    const shipping = items.length > 0 ? FLAT_SHIPPING : 0;

    return {
        items,
        couponCode: coupon ? coupon.code : null,
        discountPercent: coupon ? coupon.percent : 0,
        subtotal,
        discount,
        shipping,
        grandTotal: roundCents(subtotal - discount + shipping),
    };
}
