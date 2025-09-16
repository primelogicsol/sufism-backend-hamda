import { Router } from "express";
import adminController, { verify as adminVerify } from "../../controllers/adminController/adminController.js";
import userAuthController from "../../controllers/authController/userAuthController.js";
import vendorAuthController from "../../controllers/authController/vendorAuthController.js";
import { adminAuth } from "../../middleware/adminAuthMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import {
  forgotPasswordRequestFromUserSchema,
  updateForgotPasswordSchema,
  userLoginSchema,
  userRegistrationSchema,
  vendorRegistrationSchema,
  verifyGoogleLoginSchema,
  verifyOTPSchema,
  verifyUserSchema
} from "../../validations/zod.js";
export const authRouter: Router = Router();
authRouter.route(`/register`).post(validateDataMiddleware(userRegistrationSchema), userAuthController.register);
authRouter.route(`/vendor-register`).post(validateDataMiddleware(vendorRegistrationSchema), vendorAuthController.register);
// 2 req per minute from single  ip adress
authRouter.route(`/verify-account`).post(validateDataMiddleware(verifyOTPSchema), userAuthController.verifyAccount);
// 5 req per mnute from single  ip adress
authRouter.route("/login").post(validateDataMiddleware(userLoginSchema), userAuthController.login);
authRouter.route("/admin/login").post(adminController.login);
authRouter.route("/admin/verify").get(adminAuth, adminVerify);

authRouter.route("/refresh-access-token").get(userAuthController.refreshAccessToken);
authRouter.route("/resend-OTP").post(validateDataMiddleware(verifyUserSchema), userAuthController.resendOTPLink);
authRouter.route("/google-auth").post(validateDataMiddleware(verifyGoogleLoginSchema), userAuthController.googleAuth);
authRouter.route("/forgot-password").post(validateDataMiddleware(forgotPasswordRequestFromUserSchema), userAuthController.forgotPasswordRequest);

authRouter.route("/new-password").post(validateDataMiddleware(updateForgotPasswordSchema), userAuthController.passwordReset);
