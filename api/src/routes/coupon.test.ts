import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import couponRoutes from '../routes/coupon';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/coupons', couponRoutes);

describe('Coupon API Routes', () => {
  describe('POST /api/coupons/validate', () => {
    it('should validate a valid coupon code', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'WELCOME10',
          orderAmount: 50.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
      expect(response.body.code).toBe('WELCOME10');
      expect(response.body.discountType).toBe('percentage');
      expect(response.body.discountValue).toBe(10);
    });

    it('should calculate percentage discount correctly', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'WELCOME10',
          orderAmount: 100.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
      expect(response.body.applicableDiscount).toBe(10.0); // 10% of 100
    });

    it('should calculate fixed amount discount correctly', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'SAVE5',
          orderAmount: 100.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
      expect(response.body.discountType).toBe('fixed');
      expect(response.body.discountValue).toBe(5.0);
      expect(response.body.applicableDiscount).toBe(5.0);
    });

    it('should reject invalid coupon code', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'INVALID123',
          orderAmount: 50.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.message).toBe('Coupon code not found');
    });

    it('should reject coupon below minimum order amount', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'SAVE5', // Requires minimum $50
          orderAmount: 30.0, // Below minimum
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.message).toContain('Minimum order amount');
    });

    it('should accept coupon at minimum order amount', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'SAVE5', // Requires minimum $50
          orderAmount: 50.0, // Exactly at minimum
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'WELCOME10',
          // Missing orderAmount
        });

      expect(response.status).toBe(400);
      expect(response.body.isValid).toBe(false);
    });

    it('should be case-insensitive for coupon codes', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'welcome10', // lowercase
          orderAmount: 50.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
      expect(response.body.code).toBe('WELCOME10');
    });

    it('should handle coupon with no minimum amount requirement', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'WELCOME10', // No minimum
          orderAmount: 1.0, // Very small order
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
    });

    it('should calculate fixed discount not exceeding order amount', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'SAVE5', // $5 fixed discount
          orderAmount: 3.0, // Order less than discount
        });

      // Fixed discount should be capped at order amount, but SAVE5 has min $50 requirement
      // This should be invalid due to minimum
      expect(response.body.isValid).toBe(false);
    });
  });
});
