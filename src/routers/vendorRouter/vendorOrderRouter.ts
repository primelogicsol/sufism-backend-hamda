import { Router } from "express";
import vendorOrdersControllers from "../../controllers/vendorController/vendorOrdersControllers.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { vendorOrderSchema } from "../../validations/zod.js";

export const vendorOrderRouter: Router = Router();

vendorOrderRouter
  .route(`/vendor-orders/:id`)
  .post(authMiddleware.checkToken, validateDataMiddleware(vendorOrderSchema), vendorOrdersControllers.getVendorOrders);
vendorOrderRouter.patch("/vendor-orders/status/:ids", authMiddleware.checkToken, vendorOrdersControllers.updateOrderItemStatus);

vendorOrderRouter.get("/vendor-orders/item/:orderItemId", authMiddleware.checkToken, vendorOrdersControllers.getOrderItemDetail);
vendorOrderRouter.get("/vendor-orders/stats/:id", authMiddleware.checkToken, vendorOrdersControllers.getVendorOrderStats);
