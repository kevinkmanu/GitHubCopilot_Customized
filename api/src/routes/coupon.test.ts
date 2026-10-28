import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import couponRouter from './coupon';
import { coupons } from '../seedData';

let app: express.Express;

describe('Coupon API', () => {
    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/coupons', couponRouter);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns the discount rate for a valid coupon', async () => {
        const response = await request(app).post('/coupons/validate').send({ code: 'SAVE5' });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ code: 'SAVE5', discountRate: 0.05 });
    });

    it('matches codes case-insensitively and ignores surrounding whitespace', async () => {
        const response = await request(app).post('/coupons/validate').send({ code: '  save5 ' });
        expect(response.status).toBe(200);
        expect(response.body.code).toBe('SAVE5');
    });

    it('returns 404 for an unknown code', async () => {
        const response = await request(app).post('/coupons/validate').send({ code: 'NOPE' });
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Invalid coupon code' });
    });

    it('returns 410 for an expired coupon', async () => {
        const response = await request(app).post('/coupons/validate').send({ code: 'SUMMER20' });
        expect(response.status).toBe(410);
        expect(response.body).toEqual({ error: 'This coupon has expired' });
    });

    it('accepts an expiring coupon through the end of its last day', async () => {
        const expiring = coupons.find(c => c.expiresAt)!;
        vi.useFakeTimers({ toFake: ['Date'] });

        vi.setSystemTime(new Date(`${expiring.expiresAt}T23:59:59Z`));
        const lastDay = await request(app).post('/coupons/validate').send({ code: expiring.code });
        expect(lastDay.status).toBe(200);

        vi.setSystemTime(new Date(`${expiring.expiresAt}T23:59:59Z`).getTime() + 1000);
        const nextDay = await request(app).post('/coupons/validate').send({ code: expiring.code });
        expect(nextDay.status).toBe(410);
    });

    it.each([
        ['missing body', {}],
        ['empty code', { code: '' }],
        ['blank code', { code: '   ' }],
        ['non-string code', { code: 5 }],
        ['overlong code', { code: 'A'.repeat(33) }],
    ])('returns 400 for %s', async (_label, body) => {
        const response = await request(app).post('/coupons/validate').send(body);
        expect(response.status).toBe(400);
    });
});
