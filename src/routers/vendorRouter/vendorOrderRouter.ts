import { Router } from "express";
import vendorOrderController from "../../controllers/vendorController/vendorOrderController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { vendorOrderValidation } from "../../validations/vendorOrderValidation.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.checkToken);

// Vendor order management routes
router.get("/", vendorOrderController.getAllVendorOrders);
router.get("/summary", vendorOrderController.getVendorOrderSummary);
router.get("/analytics", vendorOrderController.getVendorAnalytics);
router.get("/:orderItemId", vendorOrderController.getOrderItemDetail);
router.put("/:orderItemId/status", validateDataMiddleware(vendorOrderValidation.updateOrderItemStatus), vendorOrderController.updateOrderItemStatus);
router.post("/bulk-update", validateDataMiddleware(vendorOrderValidation.bulkUpdateOrderItemStatus), vendorOrderController.bulkUpdateOrderItemStatus);

export default router;
