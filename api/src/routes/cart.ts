/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart pricing and persistence
 */

/**
 * @swagger
 * /api/cart/quote:
 *   post:
 *     summary: Validate cart items and coupon and return server-calculated totals
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *               couponCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cart quote with subtotal, discount, shipping and grand total
 *       400:
 *         description: Invalid items or coupon
 * /api/cart/{userId}:
 *   get:
 *     summary: Get the saved cart of a logged-in user
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Saved cart
 *   put:
 *     summary: Save the cart of a logged-in user
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Saved cart
 *       400:
 *         description: Invalid cart
 */

import express from 'express';
import { getProducts } from './product';
import { calculateQuote, CartValidationError } from '../utils/pricing';

const router = express.Router();

interface SavedCart {
    items: { productId: number; quantity: number }[];
    couponCode: string | null;
}

const savedCarts = new Map<string, SavedCart>();

export const resetCarts = () => savedCarts.clear();

router.post('/quote', (req, res) => {
    try {
        res.json(calculateQuote(req.body?.items, getProducts(), req.body?.couponCode));
    } catch (error) {
        if (error instanceof CartValidationError) {
            res.status(400).json({ error: error.message, field: error.field });
            return;
        }
        throw error;
    }
});

router.get('/:userId', (req, res) => {
    res.json(savedCarts.get(req.params.userId) ?? { items: [], couponCode: null });
});

router.put('/:userId', (req, res) => {
    try {
        const couponCode = req.body?.couponCode ?? null;
        const quote = calculateQuote(req.body?.items, getProducts(), couponCode);
        const cart: SavedCart = {
            items: quote.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
            couponCode: quote.couponCode,
        };
        savedCarts.set(req.params.userId, cart);
        res.json(cart);
    } catch (error) {
        if (error instanceof CartValidationError) {
            res.status(400).json({ error: error.message, field: error.field });
            return;
        }
        throw error;
    }
});

export default router;
