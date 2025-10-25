import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import vendorOnboardingController from "../controllers/vendorController/vendorOnboardingController.js";

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.checkToken);

// Onboarding status and requirements routes
router.get("/status", vendorOnboardingController.getOnboardingStatus as any);
router.get("/requirements", vendorOnboardingController.getOnboardingRequirements as any);
router.put("/progress", vendorOnboardingController.updateOnboardingProgress as any);
router.get("/readiness", vendorOnboardingController.getVendorReadinessStatus as any);

export default router;
