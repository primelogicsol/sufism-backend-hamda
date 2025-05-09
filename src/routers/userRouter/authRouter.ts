import { Router } from "express";
import authController from "../../controllers/userController/authController.js";
import rateLimiterMiddleware from "../../middleware/rateLimiterMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { forgotPasswordRequestFromUserSchema, updateForgotPasswordSchema, userLoginSchema, userRegistrationSchema, verifyGoogleLoginSchema, verifyOTPSchema, verifyUserSchema } from "../../validations/zod.js";
export const authRouter: Router = Router();
authRouter
  .route(`/register`)
  .post(validateDataMiddleware(userRegistrationSchema), (req, res, next) => rateLimiterMiddleware.handle(req, res, next, 5), authController.register);
// 2 req per minute from single  ip adress
authRouter.route(`/verify-account`).post(
  validateDataMiddleware(verifyOTPSchema),
  (req, res, next) => rateLimiterMiddleware.handle(req, res, next, 5), authController.verifyAccount);
// 5 req per mnute from single  ip adress
authRouter
  .route(`/login`)
  .post(
    validateDataMiddleware(userLoginSchema),
    (req, res, next) => rateLimiterMiddleware.handle(req, res, next, 5, undefined, 20, 180),
    authController.login
  );

authRouter.route("/refresh-access-token").get(authController.refreshAccessToken);
authRouter
  .route("/resend-OTP")
  .post(validateDataMiddleware(verifyUserSchema), (req, res, next) => rateLimiterMiddleware.handle(req, res, next, 5), authController.resendOTPLink);
authRouter
  .route("/google-auth")
  .post(
    validateDataMiddleware(verifyGoogleLoginSchema),
    (req, res, next) => rateLimiterMiddleware.handle(req, res, next, 5),
    authController.googleAuth
  );
  authRouter
  .route("/forgot-password")
  .post(
    validateDataMiddleware(forgotPasswordRequestFromUserSchema),
    (req, res, next) => rateLimiterMiddleware.handle(req, res, next, 5),
    authController.fogotPasswordRequest
  );
  
  authRouter
  .route("/new-password")
  .post(validateDataMiddleware(updateForgotPasswordSchema),
    (req, res, next) => rateLimiterMiddleware.handle(req, res, next, 5),
    authController.passwordReset
  );