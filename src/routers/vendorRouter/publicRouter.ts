import { Router } from "express";
import vendorAuthController from "../../controllers/authController/vendorAuthController.js";
import vendorController from "../../controllers/vendorController/vendorController.js";
import vendorOrdersControllers from "../../controllers/vendorController/vendorOrdersControllers.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import fileUploader from "../../middleware/multerMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { userLoginSchema, vendorRegistrationSchema, vendorCompanyProfileSchema } from "../../validations/zod.js";

export const vendorPublicRouter: Router = Router();
// vendor
vendorPublicRouter.route(`/vendor-register/:id?`).post(validateDataMiddleware(vendorRegistrationSchema), fileUploader, vendorAuthController.register);
vendorPublicRouter.route(`/vendor-login`).post(validateDataMiddleware(userLoginSchema), vendorAuthController.login);
vendorPublicRouter.route(`/vendor/:id`).post(vendorController.getVendorById);

// Vendor company profile routes (protected)
vendorPublicRouter
  .route(`/vendor/company-profile`)
  .get(authMiddleware.checkToken, vendorController.getVendorCompanyProfile)
  .put(authMiddleware.checkToken, validateDataMiddleware(vendorCompanyProfileSchema), vendorController.updateVendorCompanyProfile);

// Vendor orders routes (protected)
vendorPublicRouter.route(`/vendor/orders`).get(authMiddleware.checkToken, vendorOrdersControllers.getAllVendorOrders);
