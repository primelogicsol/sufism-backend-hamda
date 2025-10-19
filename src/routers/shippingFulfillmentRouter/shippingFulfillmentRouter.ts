import { Router } from "express";
import shippingFulfillmentController from "../../controllers/shippingFulfillmentController/shippingFulfillmentController.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { shippingRateRequestSchema } from "../../validations/shippingFulfillmentValidation.js";
import authMiddleware from "../../middleware/authMiddleware.js";

export const shippingFulfillmentRouter: Router = Router();

// Shipping routes
shippingFulfillmentRouter.post(
  "/rates",
  authMiddleware.checkToken,
  validateDataMiddleware(shippingRateRequestSchema),
  shippingFulfillmentController.calculateShippingRates
);
shippingFulfillmentRouter.post("/orders/:orderId/shipments", shippingFulfillmentController.createShipment);
shippingFulfillmentRouter.put("/shipments/:trackingNumber/status", shippingFulfillmentController.updateShipmentStatus);
shippingFulfillmentRouter.get("/shipments/:trackingNumber/tracking", shippingFulfillmentController.getShipmentTracking);

// USPS-specific routes
shippingFulfillmentRouter.post("/orders/:orderId/usps/label", shippingFulfillmentController.generateUSPSLabel);
shippingFulfillmentRouter.post("/usps/validate-address", shippingFulfillmentController.validateUSPSAddress);
shippingFulfillmentRouter.get("/usps/track/:trackingNumber", shippingFulfillmentController.trackUSPSPackage);

// Return routes
shippingFulfillmentRouter.post("/orders/:orderId/returns", shippingFulfillmentController.requestReturn);
shippingFulfillmentRouter.put("/returns/:returnId/process", shippingFulfillmentController.processReturnRequest);
shippingFulfillmentRouter.post("/returns/:returnId/process-items", shippingFulfillmentController.processReturnedItems);
shippingFulfillmentRouter.get("/returns/analytics", shippingFulfillmentController.getReturnAnalytics);
shippingFulfillmentRouter.get("/returns/vendor/analytics", shippingFulfillmentController.getVendorReturnAnalytics);
shippingFulfillmentRouter.get("/returns/user", shippingFulfillmentController.getUserReturns);
shippingFulfillmentRouter.get("/returns/all", shippingFulfillmentController.getAllReturns);
