import { Router } from "express";
import { couponRouter } from "./productsRouter/couponRouter.js";
import { productRouter } from "./productsRouter/productRouter.js";
import { authRouter } from "./userRouter/authRouter.js";
import { userRouter } from "./userRouter/userRouter.js";

export const defaultRouter: Router = Router();

defaultRouter.use("/user", authRouter);
defaultRouter.use("/user", userRouter);
defaultRouter.use("/", productRouter);
defaultRouter.use("/", couponRouter);
