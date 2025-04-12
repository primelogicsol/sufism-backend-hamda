import { Router } from "express";
import authController from "../../controllers/userController/autthController.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { userLoginSchema, userRegistrationSchema, verifyGoogleLoginSchema, verifyUserSchema } from "../../validations/zod.js";
export const authRouter: Router = Router();
authRouter.route(`/register`).post(validateDataMiddleware(userRegistrationSchema), authController.register);
authRouter.route(`/verify-account`).get(authController.verifyAccount);
authRouter.route(`/login`).post(validateDataMiddleware(userLoginSchema), authController.login);
authRouter.route("/refresh-access-token").get(authController.refreshAccessToken);
authRouter.route("/resend-OTP").post(validateDataMiddleware(verifyUserSchema), authController.resendOTPLink);
authRouter.route("/google-auth").post(validateDataMiddleware(verifyGoogleLoginSchema), authController.googleAuth);
//social auth
