import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import vendorPayoutController from "../controllers/vendorController/vendorPayoutController.js";

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.checkToken);

// Payout Configuration Routes
router.post("/config", vendorPayoutController.createOrUpdatePayoutConfig as any);
router.get("/config", vendorPayoutController.getPayoutConfig as any);
router.put("/status", vendorPayoutController.updatePayoutConfigStatus as any);

// Payout Methods
router.get("/methods", vendorPayoutController.getPayoutMethods as any);

// Onboarding Status
router.get("/onboarding-status", vendorPayoutController.getOnboardingStatus as any);

// Admin Routes
router.post("/verify/:vendorId", vendorPayoutController.verifyPayoutConfig as any);

export default router;
