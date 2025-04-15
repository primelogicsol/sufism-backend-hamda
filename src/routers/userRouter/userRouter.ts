import { Router } from "express";
import user from "../../controllers/userController/userController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { membershipSchema } from "../../validations/zod.js";

export const userRouter: Router = Router();

userRouter.route("/membership").post(authMiddleware.checkToken, validateDataMiddleware(membershipSchema), user.membership);
