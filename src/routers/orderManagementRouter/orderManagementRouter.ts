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
orderManagementRouter.get("/", authMiddleware.checkToken, orderManagementController.searchOrders);
orderManagementRouter.post("/:cancelItemId/cancel", authMiddleware.checkToken, orderManagementController.cancelOrderItem);
orderManagementRouter.post("/:returnItemId/return", authMiddleware.checkToken, orderManagementController.createReturnRequestForItem);
orderManagementRouter.get("/:orderId", authMiddleware.checkToken, orderManagementController.getOrderById);
orderManagementRouter.put("/:orderId/status", authMiddleware.checkToken, orderManagementController.updateOrderStatus);
orderManagementRouter.post("/:orderId/cancel-order", authMiddleware.checkToken, orderManagementController.cancelOrder);
orderManagementRouter.post("/:orderId/notes", authMiddleware.checkToken, orderManagementController.addOrderNote);
orderManagementRouter.get("/:orderId/tracking", authMiddleware.checkToken, orderManagementController.getOrderTracking);
