import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cartRouter, { resetCarts } from './cart';
import { calculateQuote, roundCents } from '../utils/pricing';
import { Product } from '../models/product';

let app: express.Express;

const testProducts: Product[] = [
    { productId: 1, supplierId: 1, name: 'A', description: '', price: 100, sku: 'A', unit: 'piece', imgName: 'a.png' },
    { productId: 2, supplierId: 1, name: 'B', description: '', price: 67, sku: 'B', unit: 'piece', imgName: 'b.png' },
    { productId: 3, supplierId: 1, name: 'C', description: '', price: 80, sku: 'C', unit: 'piece', imgName: 'c.png', discount: 0.25 },
];

describe('calculateQuote', () => {
    it('matches the example: 267 - 13.35 + 10 = 263.65', () => {
        const quote = calculateQuote(
            [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }],
            testProducts,
            'SAVE5'
        );
        expect(quote.subtotal).toBe(267);
        expect(quote.discount).toBe(13.35);
        expect(quote.discountPercent).toBe(5);
        expect(quote.shipping).toBe(10);
        expect(quote.grandTotal).toBe(263.65);
    });

    it('uses discounted product prices and computes line totals', () => {
        const quote = calculateQuote([{ productId: 3, quantity: 3 }], testProducts);
        expect(quote.items[0].unitPrice).toBe(60);
        expect(quote.items[0].lineTotal).toBe(180);
        expect(quote.grandTotal).toBe(190);
    });

    it('returns zero totals and no shipping for an empty cart', () => {
        const quote = calculateQuote([], testProducts);
        expect(quote.grandTotal).toBe(0);
        expect(quote.shipping).toBe(0);
    });

    it('merges duplicate product lines', () => {
        const quote = calculateQuote([{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }], testProducts);
        expect(quote.items).toHaveLength(1);
        expect(quote.items[0].quantity).toBe(3);
    });

    it.each([0, -1, 1.5, NaN])('rejects invalid quantity %s', quantity => {
        expect(() => calculateQuote([{ productId: 1, quantity }], testProducts)).toThrow();
    });

    it('rejects unknown products, invalid and expired coupons', () => {
        expect(() => calculateQuote([{ productId: 99, quantity: 1 }], testProducts)).toThrow(/not found/);
        expect(() => calculateQuote([{ productId: 1, quantity: 1 }], testProducts, 'NOPE')).toThrow(/Invalid/);
        expect(() => calculateQuote([{ productId: 1, quantity: 1 }], testProducts, 'EXPIRED20')).toThrow(/expired/);
    });

    it('accepts coupon codes case-insensitively', () => {
        expect(calculateQuote([{ productId: 1, quantity: 1 }], testProducts, ' save10 ').discountPercent).toBe(10);
    });

    it('rounds to cents', () => {
        expect(roundCents(1.005)).toBe(1.01);
    });
});

describe('Cart API', () => {
    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/cart', cartRouter);
        resetCarts();
    });

    it('quotes a cart using server-side prices', async () => {
        const response = await request(app)
            .post('/cart/quote')
            .send({ items: [{ productId: 1, quantity: 2, price: 0.01 }], couponCode: 'SAVE5' });
        expect(response.status).toBe(200);
        expect(response.body.items[0].unitPrice).toBeGreaterThan(1);
        expect(response.body.grandTotal).toBe(
            roundCents(response.body.subtotal - response.body.discount + response.body.shipping)
        );
    });

    it('returns 400 for an invalid coupon', async () => {
        const response = await request(app).post('/cart/quote').send({ items: [{ productId: 1, quantity: 1 }], couponCode: 'BAD' });
        expect(response.status).toBe(400);
        expect(response.body.field).toBe('couponCode');
    });

    it('returns 400 for an invalid quantity', async () => {
        const response = await request(app).post('/cart/quote').send({ items: [{ productId: 1, quantity: 0 }] });
        expect(response.status).toBe(400);
        expect(response.body.field).toBe('items');
    });

    it('returns 400 when items are missing', async () => {
        expect((await request(app).post('/cart/quote').send({})).status).toBe(400);
    });

    it('persists and returns a saved cart per user', async () => {
        const empty = await request(app).get('/cart/u1');
        expect(empty.body).toEqual({ items: [], couponCode: null });

        const saved = await request(app).put('/cart/u1').send({ items: [{ productId: 1, quantity: 2 }], couponCode: 'SAVE5' });
        expect(saved.status).toBe(200);

        const loaded = await request(app).get('/cart/u1');
        expect(loaded.body).toEqual({ items: [{ productId: 1, quantity: 2 }], couponCode: 'SAVE5' });
        expect((await request(app).get('/cart/u2')).body.items).toEqual([]);
    });

    it('rejects saving an invalid cart', async () => {
        const response = await request(app).put('/cart/u1').send({ items: [{ productId: 1, quantity: -2 }] });
        expect(response.status).toBe(400);
    });
});
