import { Router } from "express";
import { productRouter } from "./productsRouter/productRouter.js";
import { contentRouter } from "./contentRouter/contentRouter.js";
import { authRouter } from "./userRouter/authRouter.js";
import { userRouter } from "./userRouter/userRouter.js";

export const defaultRouter: Router = Router();

defaultRouter.use("/user", authRouter);
defaultRouter.use("/user", userRouter);
defaultRouter.use("/", productRouter);
defaultRouter.use("/content", contentRouter);
