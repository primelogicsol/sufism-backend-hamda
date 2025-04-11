import { Router } from "express";
import { performanceRouter } from "./performanceRouter/performanceRouter.js";
import { authRouter } from "./userRouter/authRouter.js";

export const defaultRouter: Router = Router();

defaultRouter.use("/", performanceRouter);
defaultRouter.use("/user", authRouter);
