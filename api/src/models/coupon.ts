/**
 * @swagger
 * components:
 *   schemas:
 *     Coupon:
 *       type: object
 *       required:
 *         - code
 *         - discountRate
 *       properties:
 *         code:
 *           type: string
 *           description: The coupon code entered by the shopper (case-insensitive)
 *         discountRate:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 1
 *           description: Fraction taken off the cart subtotal (0.05 = 5%)
 *         expiresAt:
 *           type: string
 *           format: date
 *           description: Last day the coupon can be used; omitted when it never expires
 */
export interface Coupon {
    code: string;
    discountRate: number;
    expiresAt?: string;
}
