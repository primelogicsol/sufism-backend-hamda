import { Router } from "express";
import orderController from "../../controllers/orderController/orderController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { verifyBillingDetails, verifyOrderDetails } from "../../validations/zod.js";

export const orderRouter: Router = Router();

orderRouter.route("/order").post(authMiddleware.checkToken, validateDataMiddleware(verifyOrderDetails), orderController.createOrder);
orderRouter.route("/billing-details").post(authMiddleware.checkToken, validateDataMiddleware(verifyBillingDetails), orderController.billingDetails);
