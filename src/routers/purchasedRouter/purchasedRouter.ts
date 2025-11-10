import { Router } from "express";
import { purchaseController } from "../../controllers/userController/purchasesController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

export const purchaseRouter: Router = Router();

purchaseRouter.route("/purchases/:category?").get(authMiddleware.checkToken, purchaseController.userPurchases);
