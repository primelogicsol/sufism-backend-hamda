import { Router } from "express";
import couponController from "../../controllers/productController/couponController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { couponSchema } from "../../validations/zod.js";

export const couponRouter: Router = Router();

// Create a coupon
couponRouter.route("/coupons").post(authMiddleware.checkToken, validateDataMiddleware(couponSchema), couponController.createCoupon);

// Get all coupons
couponRouter.route("/coupons").get(authMiddleware.checkToken, couponController.viewCoupons);
couponRouter.route("/all-coupons").get(authMiddleware.checkToken, couponController.viewAllCoupons);

// Apply a coupon
couponRouter.route("/coupons/apply").post(authMiddleware.checkToken, couponController.applyCoupon);

// Update coupon by ID
couponRouter.route("/coupons/:id").patch(authMiddleware.checkToken, couponController.updateCoupon);

// Delete coupon by ID
couponRouter.route("/coupons/:id").delete(authMiddleware.checkToken, couponController.deleteCoupon);
