import { Router } from "express";
import userController from "../../controllers/userController/userController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import { validateDataMiddleware } from "../../middleware/validateMiddleware.js";
import { membershipSchema } from "../../validations/zod.js";

export const userRouter: Router = Router();

userRouter.route("/membership").post(authMiddleware.checkToken, validateDataMiddleware(membershipSchema), userController.membership);
userRouter.route("/membership").patch(authMiddleware.checkToken, validateDataMiddleware(membershipSchema), userController.membershipUpdate);
userRouter.route("/membership").delete(authMiddleware.checkToken, userController.membershipDelete);
userRouter.route("/membership").get(authMiddleware.checkToken, userController.viewMembership);
