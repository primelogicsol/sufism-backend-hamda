import { Router } from "express";
import vendorOrderController from "../../controllers/vendorController/vendorOrderController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { vendorOrderValidation } from "../../validations/vendorOrderValidation.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.checkToken);

// Vendor order management routes
router.get("/orders", vendorOrderController.getAllVendorOrders);
router.get("/orders/summary", vendorOrderController.getVendorOrderSummary);
router.get("/orders/analytics", vendorOrderController.getVendorAnalytics);
router.get("/orders/:orderItemId", vendorOrderController.getOrderItemDetail);
router.put(
  "/orders/:orderItemId/status",
  validateDataMiddleware(vendorOrderValidation.updateOrderItemStatus),
  vendorOrderController.updateOrderItemStatus
);
router.post(
  "/orders/bulk-update",
  validateDataMiddleware(vendorOrderValidation.bulkUpdateOrderItemStatus),
  vendorOrderController.bulkUpdateOrderItemStatus
);

export default router;
