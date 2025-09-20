import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import stripeController from "../../controllers/stripeController/stripeController.js";
// import express from "express";
export const stripeRouter: Router = Router();

stripeRouter.route("/setup-intent").get(authMiddleware.checkToken, stripeController.createSetupIntent);
stripeRouter.route("/payment-methods").get(authMiddleware.checkToken, stripeController.getPaymentMethods);
stripeRouter.route("/set-default-payment-method").post(authMiddleware.checkToken, stripeController.setDefaultIfNone);
// stripeRouter.route("/webhook").post(express.raw({ type: "application/json" }), stripeController.webhook);
