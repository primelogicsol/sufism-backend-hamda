import { Router } from "express";
import vendorAuthController from "../../controllers/authController/vendorAuthController.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { userLoginSchema, vendorRegistrationSchema } from "../../validations/zod.js";

export const vendorPublicRouter: Router = Router();
// vendor
vendorPublicRouter.route(`/vendor-register/:id?`).post(validateDataMiddleware(vendorRegistrationSchema), vendorAuthController.register);
vendorPublicRouter.route(`/vendor-login`).post(validateDataMiddleware(userLoginSchema), vendorAuthController.login);
vendorPublicRouter.route(`/vendor/:id`).post(vendorAuthController.getVendor);
