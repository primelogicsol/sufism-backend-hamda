import { Router } from "express";
import bookServiceController from "../../controllers/userController/bookServiceController.js";
import cartController from "../../controllers/userController/cartController.js";
import contactUsController from "../../controllers/userController/contactUsController.js";
import donationController from "../../controllers/userController/donationController.js";
import interviewSlotController from "../../controllers/userController/interviewSlotController.js";
import memberShipController from "../../controllers/userController/memberShipController.js";
import productController from "../../controllers/userController/productController.js";
import wishlistController from "../../controllers/userController/wishlistController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import fileUploader from "../../middleware/multerMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import {
  bookInterviewSchema,
  bookServiceSchema,
  cartSchema,
  conferenceRegistration,
  contactUsSchema,
  donationSchema,
  membershipSchema,
  productSchema,
  reviewSchema,
  updateConferenceStatusSchema,
  wishlistSchema
} from "../../validations/zod.js";
import conferenceController from "../../controllers/userController/conferenceController.js";

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

userRouter.route("/review").post(authMiddleware.checkToken, validateDataMiddleware(reviewSchema), productController.review);
userRouter.route("/review/:id").get(authMiddleware.checkToken, productController.viewReview);

userRouter.route("/cart").post(authMiddleware.checkToken, validateDataMiddleware(cartSchema), cartController.addToCart);
userRouter.route("/cart/:id").delete(authMiddleware.checkToken, cartController.deleteCartItem);
userRouter.route("/cart").delete(authMiddleware.checkToken, cartController.clearCart);
userRouter.route("/cart").get(authMiddleware.checkToken, cartController.viewCart);
userRouter.route("/cart").patch(authMiddleware.checkToken, validateDataMiddleware(cartSchema), cartController.updateCartItem);

userRouter.route("/wishlist").post(authMiddleware.checkToken, validateDataMiddleware(wishlistSchema), wishlistController.addToWishlist);
userRouter.route("/wishlist/:id").delete(authMiddleware.checkToken, wishlistController.deleteWishlistItem);
userRouter.route("/wishlist").delete(authMiddleware.checkToken, wishlistController.clearWishlist);
userRouter.route("/wishlist").get(authMiddleware.checkToken, wishlistController.viewWishlist);

userRouter.route("/book-service").post(authMiddleware.checkToken, validateDataMiddleware(bookServiceSchema), bookServiceController.bookService);
userRouter.route("/book-service").get(authMiddleware.checkToken, bookServiceController.viewServiceBooking);

userRouter
  .route("/book-interview")
  .post(authMiddleware.checkToken, validateDataMiddleware(bookInterviewSchema), interviewSlotController.interviewBook);
userRouter.route("/book-interview").get(authMiddleware.checkToken, interviewSlotController.interviewBookView);
userRouter.route("/book-interview/:id").delete(authMiddleware.checkToken, interviewSlotController.interviewBookCancel);

userRouter.route("/contact-us").post(authMiddleware.checkToken, validateDataMiddleware(contactUsSchema), contactUsController.contactUs);

userRouter.route("/conference").post(authMiddleware.checkToken, validateDataMiddleware(conferenceRegistration), conferenceController.conferenceBook);

userRouter.route("/conference").get(authMiddleware.checkToken, conferenceController.viewConferenceBook);

userRouter
  .route("/conference/:id")
  .post(authMiddleware.checkToken, validateDataMiddleware(updateConferenceStatusSchema), conferenceController.updateConferenceStatus);
