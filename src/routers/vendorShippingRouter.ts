import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import vendorShippingController from "../controllers/vendorController/vendorShippingController.js";

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.checkToken);

// Shipping configuration routes
router.post("/config", vendorShippingController.createOrUpdateShippingConfig as any);
router.get("/config", vendorShippingController.getShippingConfig as any);
router.put("/status", vendorShippingController.updateShippingConfigStatus as any);
router.get("/summary", vendorShippingController.getShippingConfigSummary as any);

// Shipping zones routes
router.post("/zones", vendorShippingController.createShippingZone as any);
router.post("/zones-with-rates", vendorShippingController.createZoneWithRates as any);
router.put("/zones/:zoneId", vendorShippingController.updateShippingZone as any);
router.delete("/zones/:zoneId", vendorShippingController.deleteShippingZone as any);

// Shipping rates routes
router.post("/rates", vendorShippingController.createShippingRate as any);
router.put("/rates/:rateId", vendorShippingController.updateShippingRate as any);
router.delete("/rates/:rateId", vendorShippingController.deleteShippingRate as any);

// Shipping calculation and validation routes
router.post("/calculate", vendorShippingController.calculateShippingRates as any);
router.get("/validate", vendorShippingController.validateShippingConfig as any);

// Utilities
router.post("/seed-dummy-config", vendorShippingController.seedDummyShippingConfig as any);

export default router;
