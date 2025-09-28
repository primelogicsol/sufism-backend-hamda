import { Router } from "express";
import uploadRouter from "./bulkuploader/upload.js";
import { contentRouter } from "./contentRouter/contentRouter.js";
import { orderRouter } from "./orderRouter/orderRouter.js";
import { couponRouter } from "./productsRouter/couponRouter.js";
import { productRouter } from "./productsRouter/productRouter.js";
import { purchaseRouter } from "./purchasedRouter/purchasedRouter.js";
import { stripeRouter } from "./stripe/route.js";
import { authRouter } from "./userRouter/authRouter.js";
import { userRouter } from "./userRouter/userRouter.js";
import { vendorPublicRouter } from "./vendorRouter/publicRouter.js";
import { vendorOrderRouter } from "./vendorRouter/vendorOrderRouter.js";

export const defaultRouter: Router = Router();

defaultRouter.use("/user", authRouter);
defaultRouter.use("/user", userRouter);
defaultRouter.use("/user", orderRouter);
defaultRouter.use("/user", purchaseRouter);
defaultRouter.use("/", productRouter);
defaultRouter.use("/", vendorPublicRouter);
defaultRouter.use("/", vendorOrderRouter);
defaultRouter.use("/", couponRouter);
defaultRouter.use("/stripe", stripeRouter);
defaultRouter.use("/content", contentRouter);
defaultRouter.use("/bulk-uploader", uploadRouter);
