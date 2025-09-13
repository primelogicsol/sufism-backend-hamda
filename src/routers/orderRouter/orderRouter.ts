import { Router } from "express";
import orderController from "../../controllers/orderController/orderController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

export const orderRouter: Router = Router();

orderRouter.route("/order").get(authMiddleware.checkToken, orderController.createOrder);
