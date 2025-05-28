import { Router } from "express";
import authController from "../../controllers/userController/authController.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import {
  forgotPasswordRequestFromUserSchema,
  updateForgotPasswordSchema,
  userLoginSchema,
  userRegistrationSchema,
  verifyGoogleLoginSchema,
  verifyOTPSchema,
  verifyUserSchema
} from "../../validations/zod.js";
export const authRouter: Router = Router();
authRouter.route(`/register`).post(validateDataMiddleware(userRegistrationSchema), authController.register);
// 2 req per minute from single  ip adress
authRouter.route(`/verify-account`).post(validateDataMiddleware(verifyOTPSchema), authController.verifyAccount);
// 5 req per mnute from single  ip adress
authRouter.route(`/login`).post(
  validateDataMiddleware(userLoginSchema),

  authController.login
);

authRouter.route("/refresh-access-token").get(authController.refreshAccessToken);
authRouter.route("/resend-OTP").post(validateDataMiddleware(verifyUserSchema), authController.resendOTPLink);
authRouter.route("/google-auth").post(validateDataMiddleware(verifyGoogleLoginSchema), authController.googleAuth);
authRouter.route("/forgot-password").post(validateDataMiddleware(forgotPasswordRequestFromUserSchema), authController.forgotPasswordRequest);

authRouter.route("/new-password").post(validateDataMiddleware(updateForgotPasswordSchema), authController.passwordReset);
