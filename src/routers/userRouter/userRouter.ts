import { Router } from "express";
import donationController from "../../controllers/userController/donationController.js";
import memberShipController from "../../controllers/userController/memberShipController.js";
import productController from "../../controllers/userController/productController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import fileUploader from "../../middleware/multerMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { donationSchema, membershipSchema, productSchema, reviewSchema } from "../../validations/zod.js";

export const userRouter: Router = Router();

userRouter.route("/membership").post(authMiddleware.checkToken, validateDataMiddleware(membershipSchema), memberShipController.membership);
userRouter.route("/membership").patch(authMiddleware.checkToken, validateDataMiddleware(membershipSchema), memberShipController.updateMembership);
userRouter.route("/membership").delete(authMiddleware.checkToken, memberShipController.deleteMembership);
userRouter.route("/membership").get(authMiddleware.checkToken, memberShipController.viewMembership);

userRouter.route("/donation").post(authMiddleware.checkToken, validateDataMiddleware(donationSchema), donationController.donation);
userRouter.route("/donation").get(authMiddleware.checkToken, donationController.viewDonation);
userRouter.route("/donation").delete(authMiddleware.checkToken, donationController.deleteDonation);
userRouter.route("/donation").patch(authMiddleware.checkToken, validateDataMiddleware(donationSchema), donationController.updateDonation);

userRouter.route("/product").post(fileUploader, validateDataMiddleware(productSchema), productController.product);
userRouter.route("/product").get(productController.viewAllProduct);
userRouter.route("/product/:id").get(productController.viewProduct);

userRouter.route("/review").post(authMiddleware.checkToken,validateDataMiddleware(reviewSchema), productController.review);
userRouter.route("/review/:id").get(authMiddleware.checkToken,productController.viewReview);

