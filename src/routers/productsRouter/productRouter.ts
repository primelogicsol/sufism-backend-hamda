import { Router } from "express";
import accessoriesController from "../../controllers/productController/accessoriesController.js";
import audioController from "../../controllers/productController/audioController.js";
import bulkProductController from "../../controllers/productController/bulkProductController.js";
import buyerProductsController from "../../controllers/productController/buyerProductsController.js";
import decorationController from "../../controllers/productController/decorationController.js";
import digitalBookController from "../../controllers/productController/digitalBookController.js";
import fashionController from "../../controllers/productController/fashionController.js";
import livingController from "../../controllers/productController/livingController.js";
import meditationController from "../../controllers/productController/meditationController.js";
import reviewController from "../../controllers/productController/reviewController.js";
import interviewSlotController from "../../controllers/userController/interviewSlotController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import fileUploader from "../../middleware/multerMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { audioSchema, bookSchema, productSchema, reviewSchema } from "../../validations/zod.js";

// const upload = multer({ storage: multer.memoryStorage() });

export const productRouter: Router = Router();
// productRouter.route("/bulk-decoration").post(
//   upload.single("file"), // 'file' is the form field name
//   decorationController.bulkCreate
// );
productRouter.route("/decoration").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(productSchema), decorationController.create);
productRouter.route("/decoration/:id").patch(authMiddleware.checkToken, fileUploader, decorationController.update);
productRouter.route("/decoration/:id").delete(authMiddleware.checkToken, decorationController.delete);
productRouter.route("/decoration").get(authMiddleware.checkToken, decorationController.getAll);
productRouter.route("/decoration/:id").get(authMiddleware.checkToken, decorationController.getById);

// Unified Review Endpoints - Single API for all product categories
productRouter.route("/review").post(authMiddleware.checkToken, validateDataMiddleware(reviewSchema), reviewController.addReview);
productRouter.route("/review").get(authMiddleware.checkToken, reviewController.getReviews);

// Legacy review endpoints (kept for backward compatibility, will be deprecated)
productRouter.route("/review-decoration/:id").post(authMiddleware.checkToken, decorationController.addReview);
productRouter.route("/review-decoration/:id").get(authMiddleware.checkToken, decorationController.getReviews);

productRouter.route("/fashion").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(productSchema), fashionController.create);
productRouter.route("/fashion/:id").patch(authMiddleware.checkToken, fileUploader, fashionController.update);
productRouter.route("/fashion/:id").delete(authMiddleware.checkToken, fashionController.delete);
productRouter.route("/fashion/:id").get(authMiddleware.checkToken, fashionController.getById);
productRouter.route("/fashion").get(authMiddleware.checkToken, fashionController.getAll);
productRouter.route("/review-fashion/:id").post(authMiddleware.checkToken, fashionController.addReview);
productRouter.route("/review-fashion/:id").get(authMiddleware.checkToken, fashionController.getReviews); //get all reviews of that product

productRouter.route("/meditation").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(productSchema), meditationController.create);
productRouter.route("/meditation/:id").patch(authMiddleware.checkToken, fileUploader, meditationController.update);
productRouter.route("/meditation/:id").delete(authMiddleware.checkToken, meditationController.delete);
productRouter.route("/meditation/:id").get(authMiddleware.checkToken, meditationController.getById);
productRouter.route("/meditation").get(authMiddleware.checkToken, meditationController.getAll);
productRouter.route("/review-meditation/:id").post(authMiddleware.checkToken, meditationController.addReview);
productRouter.route("/review-meditation/:id").get(authMiddleware.checkToken, meditationController.getReviews);

productRouter
  .route("/accessories")
  .post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(productSchema), accessoriesController.create);
productRouter.route("/accessories/:id").patch(authMiddleware.checkToken, fileUploader, accessoriesController.update);
productRouter.route("/accessories/:id").delete(authMiddleware.checkToken, accessoriesController.delete);
productRouter.route("/review-accessories/:id").post(authMiddleware.checkToken, accessoriesController.addReview);
productRouter.route("/review-accessories/:id").get(authMiddleware.checkToken, accessoriesController.getReviews);
productRouter.route("/accessories/:id").get(authMiddleware.checkToken, accessoriesController.getById);
productRouter.route("/accessories").get(authMiddleware.checkToken, accessoriesController.getAll);

productRouter.route("/digital-books").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(bookSchema), digitalBookController.create);
productRouter.route("/digital-books/:id").get(authMiddleware.checkToken, digitalBookController.getById);
productRouter.route("/digital-books").get(authMiddleware.checkToken, digitalBookController.getAll);
productRouter.route("/digital-books/:id").patch(authMiddleware.checkToken, fileUploader, digitalBookController.update);
productRouter.route("/digital-books/:id").delete(authMiddleware.checkToken, digitalBookController.delete);
productRouter.route("/digital-books").post(authMiddleware.checkToken, digitalBookController.addReview);
productRouter.route("/review-digital-books/:id").post(authMiddleware.checkToken, digitalBookController.addReview);

productRouter.route("/living").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(productSchema), livingController.create);
productRouter.route("/living/:id").patch(authMiddleware.checkToken, fileUploader, livingController.update);
productRouter.route("/living/:id").delete(authMiddleware.checkToken, livingController.delete);
productRouter.route("/living").get(authMiddleware.checkToken, livingController.getAll);
productRouter.route("/living/:id").get(authMiddleware.checkToken, livingController.getById);

productRouter.route("/review-living").post(authMiddleware.checkToken, livingController.addReview);
productRouter.route("/review-living/:id").get(authMiddleware.checkToken, livingController.getReviews);

productRouter.route("/audio").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(audioSchema), audioController.create);
productRouter.route("/audio/:id").patch(authMiddleware.checkToken, fileUploader, audioController.update);
productRouter.route("/audio/:id").delete(authMiddleware.checkToken, audioController.delete);
productRouter.route("/review-audio").post(authMiddleware.checkToken, audioController.addReview);
productRouter.route("/review-audio/:id").get(authMiddleware.checkToken, audioController.getReviews);
productRouter.route("/audio").get(authMiddleware.checkToken, audioController.getAll);
productRouter.route("/audio/:id").get(authMiddleware.checkToken, audioController.getById);

productRouter.route("interview-book/:id").post(authMiddleware.checkToken, interviewSlotController.acceptInterview);
productRouter.route("interview-book/:id").post(authMiddleware.checkToken, interviewSlotController.acceptInterview);
productRouter.route("interview-book/:id").post(authMiddleware.checkToken, interviewSlotController.acceptInterview);

// Public buyer endpoint
productRouter.get("/products/:category", buyerProductsController.getByCategory);
productRouter.get("/products/:category/:id", buyerProductsController.getProductDetails);

productRouter.get("/proucts", fileUploader, bulkProductController.bulkProductUploader);
