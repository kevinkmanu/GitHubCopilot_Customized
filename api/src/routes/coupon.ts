/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: API endpoints for validating discount coupons
 */

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate a coupon code
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coupon is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 discountRate:
 *                   type: number
 *                   format: float
 *       400:
 *         description: Code is missing or malformed
 *       404:
 *         description: Coupon code does not exist
 *       410:
 *         description: Coupon has expired
 */

import express from 'express';
import { coupons } from '../seedData';

const router = express.Router();

const MAX_CODE_LENGTH = 32;

// Coupons are valid through the end of their expiresAt day (UTC).
const isExpired = (expiresAt: string | undefined, now: Date) =>
  expiresAt !== undefined && now.getTime() >= Date.parse(expiresAt) + 24 * 60 * 60 * 1000;

router.post('/validate', (req, res) => {
  const code = req.body?.code;
  if (typeof code !== 'string' || code.trim() === '' || code.length > MAX_CODE_LENGTH) {
    res.status(400).json({ error: 'A coupon code is required' });
    return;
  }

  const coupon = coupons.find(c => c.code === code.trim().toUpperCase());
  if (!coupon) {
    res.status(404).json({ error: 'Invalid coupon code' });
    return;
  }
  if (isExpired(coupon.expiresAt, new Date())) {
    res.status(410).json({ error: 'This coupon has expired' });
    return;
  }

  res.json({ code: coupon.code, discountRate: coupon.discountRate });
});

export default router;
