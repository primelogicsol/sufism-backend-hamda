import { Router } from "express";
import { performanceRouter } from "./performanceRouter/performanceRouter.js";
import { productRouter } from "./productsRouter/productRouter.js";
import { authRouter } from "./userRouter/authRouter.js";
import { userRouter } from "./userRouter/userRouter.js";

export const defaultRouter: Router = Router();

defaultRouter.use("/", performanceRouter);
defaultRouter.use("/user", authRouter);
defaultRouter.use("/user", userRouter);
defaultRouter.use("/", productRouter);
