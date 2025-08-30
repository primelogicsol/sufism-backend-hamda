import { Router } from "express";
import ContentController from "../../controllers/contentController/contentController.js";
import { adminAuth } from "../../middleware/adminAuthMiddleware.js";

export const contentRouter: Router = Router();

contentRouter.get("/:section", ContentController.getList);
contentRouter.get("/:section/:slug", ContentController.getItem);
contentRouter.put("/:section/:slug", adminAuth, ContentController.putItem);
contentRouter.post("/validate", adminAuth, ContentController.validateItem);
contentRouter.post("/bulk", adminAuth, ContentController.bulkSave);
