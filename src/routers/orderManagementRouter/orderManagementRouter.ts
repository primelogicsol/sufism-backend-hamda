import { Router } from "express";
import orderManagementController from "../../controllers/orderManagementController/orderManagementController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

export const orderManagementRouter: Router = Router();

// Vendor-specific routes (protected) - MUST come before /:orderId route
orderManagementRouter.get("/vendor/orders", authMiddleware.checkToken, orderManagementController.getVendorOrders);
orderManagementRouter.get("/vendor/analytics", authMiddleware.checkToken, orderManagementController.getVendorAnalytics);

// Order management routes
orderManagementRouter.get("/analytics/summary", orderManagementController.getOrderAnalytics);
orderManagementRouter.post("/bulk-update", orderManagementController.bulkUpdateOrderStatus);
orderManagementRouter.get("/", orderManagementController.searchOrders);
orderManagementRouter.get("/:orderId", orderManagementController.getOrderById);
orderManagementRouter.put("/:orderId/status", orderManagementController.updateOrderStatus);
orderManagementRouter.post("/:orderId/cancel", orderManagementController.cancelOrder);
orderManagementRouter.post("/:orderId/notes", orderManagementController.addOrderNote);
orderManagementRouter.get("/:orderId/tracking", orderManagementController.getOrderTracking);
