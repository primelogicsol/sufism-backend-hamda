import { Router } from "express";
import orderManagementController from "../../controllers/orderManagementController/orderManagementController.js";

export const orderManagementRouter: Router = Router();

// Order management routes
orderManagementRouter.get("/:orderId", orderManagementController.getOrderById);
orderManagementRouter.get("/", orderManagementController.searchOrders);
orderManagementRouter.put("/:orderId/status", orderManagementController.updateOrderStatus);
orderManagementRouter.post("/:orderId/cancel", orderManagementController.cancelOrder);
orderManagementRouter.post("/:orderId/notes", orderManagementController.addOrderNote);
orderManagementRouter.get("/:orderId/tracking", orderManagementController.getOrderTracking);
orderManagementRouter.get("/analytics/summary", orderManagementController.getOrderAnalytics);
orderManagementRouter.post("/bulk-update", orderManagementController.bulkUpdateOrderStatus);

// Vendor-specific routes
orderManagementRouter.get("/vendor/orders", orderManagementController.getVendorOrders);
orderManagementRouter.get("/vendor/analytics", orderManagementController.getVendorAnalytics);
