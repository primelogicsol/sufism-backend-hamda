import { Router } from "express";
import SufiSaintController from "../../controllers/sufiSaintController/sufiSaintController.js";
import { adminAuth } from "../../middleware/adminAuthMiddleware.js";

export const sufiSaintRouter: Router = Router();

// Public routes
sufiSaintRouter.get("/", SufiSaintController.getAll);
sufiSaintRouter.get("/periods", SufiSaintController.getPeriods);
sufiSaintRouter.get("/centuries", SufiSaintController.getCenturies);
sufiSaintRouter.get("/tags", SufiSaintController.getTags);
sufiSaintRouter.get("/:id", SufiSaintController.getById);

// Protected routes (require admin authentication)
sufiSaintRouter.post("/", adminAuth, SufiSaintController.create);
sufiSaintRouter.put("/:id", adminAuth, SufiSaintController.update);
sufiSaintRouter.delete("/:id", adminAuth, SufiSaintController.deleteSaint);
sufiSaintRouter.post("/validate", adminAuth, SufiSaintController.validate);
