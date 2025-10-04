import { Router } from "express";
import shippingFulfillmentController from "../../controllers/shippingFulfillmentController/shippingFulfillmentController.js";

export const shippingFulfillmentRouter: Router = Router();

// Shipping routes
shippingFulfillmentRouter.get("/orders/:orderId/rates", shippingFulfillmentController.calculateShippingRates);
shippingFulfillmentRouter.post("/orders/:orderId/shipments", shippingFulfillmentController.createShipment);
shippingFulfillmentRouter.put("/shipments/:trackingNumber/status", shippingFulfillmentController.updateShipmentStatus);
shippingFulfillmentRouter.get("/shipments/:trackingNumber/tracking", shippingFulfillmentController.getShipmentTracking);

// Return routes
shippingFulfillmentRouter.post("/orders/:orderId/returns", shippingFulfillmentController.requestReturn);
shippingFulfillmentRouter.put("/returns/:returnId/process", shippingFulfillmentController.processReturnRequest);
shippingFulfillmentRouter.post("/returns/:returnId/process-items", shippingFulfillmentController.processReturnedItems);
shippingFulfillmentRouter.get("/returns/analytics", shippingFulfillmentController.getReturnAnalytics);
shippingFulfillmentRouter.get("/returns/vendor/analytics", shippingFulfillmentController.getVendorReturnAnalytics);
shippingFulfillmentRouter.get("/returns/user", shippingFulfillmentController.getUserReturns);
shippingFulfillmentRouter.get("/returns/all", shippingFulfillmentController.getAllReturns);
