/**
 * @swagger
 * components:
 *   schemas:
 *     Coupon:
 *       type: object
 *       required:
 *         - code
 *         - discountType
 *         - discountValue
 *       properties:
 *         couponId:
 *           type: integer
 *           description: The unique identifier for the coupon
 *         code:
 *           type: string
 *           description: The coupon code (e.g., SAVE5, WELCOME10)
 *         discountType:
 *           type: string
 *           enum: [percentage, fixed]
 *           description: Type of discount - percentage (%) or fixed amount ($)
 *         discountValue:
 *           type: number
 *           format: float
 *           description: Discount value (e.g., 5 for 5% or $5)
 *         minOrderAmount:
 *           type: number
 *           format: float
 *           description: Minimum order amount required to apply coupon
 *         maxUsageCount:
 *           type: integer
 *           description: Maximum number of times the coupon can be used
 *         usageCount:
 *           type: integer
 *           description: Current number of times the coupon has been used
 *         validFrom:
 *           type: string
 *           format: date-time
 *           description: Coupon validity start date
 *         validUntil:
 *           type: string
 *           format: date-time
 *           description: Coupon validity end date
 *         isActive:
 *           type: boolean
 *           description: Whether the coupon is currently active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the coupon was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the coupon was last updated
 */
export interface Coupon {
  couponId?: number;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxUsageCount?: number;
  usageCount?: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  message: string;
  applicableDiscount?: number;
}
