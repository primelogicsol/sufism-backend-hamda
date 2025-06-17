import { Router } from "express";
import accessoriesController from "../../controllers/productController/accessoriesController.js";
import audioController from "../../controllers/productController/audioController.js";
import decorationController from "../../controllers/productController/decorationController.js";
import digitalBookController from "../../controllers/productController/digitalBookController.js";
import fashionController from "../../controllers/productController/fashionController.js";
import livingController from "../../controllers/productController/livingController.js";
import meditationController from "../../controllers/productController/meditationController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import fileUploader from "../../middleware/multerMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { audioSchema, bookSchema, productSchema } from "../../validations/zod.js";

export const productRouter: Router = Router();
productRouter.route("/decoration").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(productSchema), decorationController.create);
productRouter.route("/decoration").patch(authMiddleware.checkToken, fileUploader, decorationController.update);
productRouter.route("/decoration/:id").delete(authMiddleware.checkToken, decorationController.delete);
productRouter.route("/review-decoration").post(authMiddleware.checkToken, decorationController.addReview);

productRouter.route("/fashion").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(productSchema), fashionController.create);
productRouter.route("/fashion").patch(authMiddleware.checkToken, fileUploader, fashionController.update);
productRouter.route("/fashion/:id").delete(authMiddleware.checkToken, fashionController.delete);
productRouter.route("/review-fashion").post(authMiddleware.checkToken, fashionController.addReview);

productRouter.route("/meditation").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(productSchema), meditationController.create);
productRouter.route("/meditation").patch(authMiddleware.checkToken, fileUploader, meditationController.update);
productRouter.route("/meditation/:id").delete(authMiddleware.checkToken, meditationController.delete);
productRouter.route("/review-meditation").post(authMiddleware.checkToken, meditationController.addReview);

productRouter
  .route("/accessories")
  .post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(productSchema), accessoriesController.create);
productRouter.route("/accessories").patch(authMiddleware.checkToken, fileUploader, accessoriesController.update);
productRouter.route("/accessories/:id").delete(authMiddleware.checkToken, accessoriesController.delete);
productRouter.route("/review-accessories").post(authMiddleware.checkToken, accessoriesController.addReview);

productRouter.route("/digital-books").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(bookSchema), digitalBookController.create);
productRouter.route("/digital-books").patch(authMiddleware.checkToken, fileUploader, digitalBookController.update);
productRouter.route("/digital-books/:id").delete(authMiddleware.checkToken, digitalBookController.delete);
productRouter.route("digital-books").post(authMiddleware.checkToken, digitalBookController.addReview);

productRouter.route("/living").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(productSchema), livingController.create);
productRouter.route("/living").patch(authMiddleware.checkToken, fileUploader, livingController.update);
productRouter.route("/living/:id").delete(authMiddleware.checkToken, livingController.delete);
productRouter.route("living").post(authMiddleware.checkToken, livingController.addReview);

productRouter.route("/audio").post(authMiddleware.checkToken, fileUploader, validateDataMiddleware(audioSchema), audioController.create);
productRouter.route("/audio").patch(authMiddleware.checkToken, fileUploader, audioController.update);
productRouter.route("audio/:id").delete(authMiddleware.checkToken, audioController.delete);
productRouter.route("audio").post(authMiddleware.checkToken, audioController.addReview);
