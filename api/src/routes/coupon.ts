/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: API endpoints for coupon validation
 */

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate and check a coupon code
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - orderAmount
 *             properties:
 *               code:
 *                 type: string
 *                 description: The coupon code to validate
 *               orderAmount:
 *                 type: number
 *                 format: float
 *                 description: The current order subtotal
 *     responses:
 *       200:
 *         description: Coupon validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                 code:
 *                   type: string
 *                 discountType:
 *                   type: string
 *                   enum: [percentage, fixed]
 *                 discountValue:
 *                   type: number
 *                 minOrderAmount:
 *                   type: number
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */

import express, { Request, Response } from 'express';
import { Coupon, CouponValidationResult } from '../models/coupon';

const router = express.Router();

// Mock coupon database - in production, this would be in a real database
const COUPONS: Coupon[] = [
  {
    couponId: 1,
    code: 'SAVE5',
    discountType: 'fixed',
    discountValue: 5.0,
    minOrderAmount: 50.0,
    maxUsageCount: 100,
    usageCount: 25,
    validFrom: new Date('2024-01-01').toISOString(),
    validUntil: new Date('2026-12-31').toISOString(),
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    couponId: 2,
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxUsageCount: 500,
    usageCount: 150,
    validFrom: new Date('2024-01-01').toISOString(),
    validUntil: new Date('2026-12-31').toISOString(),
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    couponId: 3,
    code: 'SUMMER20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 100.0,
    maxUsageCount: 75,
    usageCount: 60,
    validFrom: new Date('2024-06-01').toISOString(),
    validUntil: new Date('2026-12-31').toISOString(),
    isActive: true,
    createdAt: new Date('2024-06-01').toISOString(),
    updatedAt: new Date('2024-06-01').toISOString(),
  },
];

/**
 * Validate a coupon code
 */
router.post('/validate', (req: Request, res: Response) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code || typeof orderAmount !== 'number') {
      return res.status(400).json({
        isValid: false,
        message: 'Code and orderAmount are required',
      });
    }

    const coupon = COUPONS.find(c => c.code.toUpperCase() === code.toUpperCase());

    if (!coupon) {
      return res.status(200).json({
        isValid: false,
        code,
        message: 'Coupon code not found',
      } as CouponValidationResult);
    }

    if (!coupon.isActive) {
      return res.status(200).json({
        isValid: false,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        message: 'Coupon code is no longer active',
      } as CouponValidationResult);
    }

    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return res.status(200).json({
        isValid: false,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        message: 'Coupon code is not yet valid',
      } as CouponValidationResult);
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return res.status(200).json({
        isValid: false,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        message: 'Coupon code has expired',
      } as CouponValidationResult);
    }

    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return res.status(200).json({
        isValid: false,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        message: `Minimum order amount of $${coupon.minOrderAmount.toFixed(2)} required`,
      } as CouponValidationResult);
    }

    if (coupon.maxUsageCount && coupon.usageCount && coupon.usageCount >= coupon.maxUsageCount) {
      return res.status(200).json({
        isValid: false,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        message: 'Coupon code has reached maximum usage limit',
      } as CouponValidationResult);
    }

    // Coupon is valid
    let applicableDiscount = 0;
    if (coupon.discountType === 'percentage') {
      applicableDiscount = orderAmount * (coupon.discountValue / 100);
    } else {
      applicableDiscount = Math.min(coupon.discountValue, orderAmount);
    }

    return res.status(200).json({
      isValid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      applicableDiscount,
      message: 'Coupon code is valid',
    } as CouponValidationResult);
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ message: 'Error validating coupon' });
  }
});

export default router;
