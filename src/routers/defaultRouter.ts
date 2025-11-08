import { Router } from "express";
import uploadRouter from "./bulkuploader/upload.js";
import { adminRouter } from "./adminRouter/adminRouter.js";
import { analyticsRouter } from "./analyticsRouter/analyticsRouter.js";
import { contentRouter } from "./contentRouter/contentRouter.js";
import { inventoryRouter } from "./inventoryRouter/inventoryRouter.js";
import { notificationRouter } from "./notificationRouter/notificationRouter.js";
import { orderManagementRouter } from "./orderManagementRouter/orderManagementRouter.js";
import { orderRouter } from "./orderRouter/orderRouter.js";
import { couponRouter } from "./productsRouter/couponRouter.js";
import { productRouter } from "./productsRouter/productRouter.js";
import { purchaseRouter } from "./purchasedRouter/purchasedRouter.js";
import { returnsRefundsRouter } from "./returnsRefundsRouter/returnsRefundsRouter.js";
import { shippingFulfillmentRouter } from "./shippingFulfillmentRouter/shippingFulfillmentRouter.js";
import { stripeRouter } from "./stripe/route.js";
import { authRouter } from "./userRouter/authRouter.js";
import { userRouter } from "./userRouter/userRouter.js";
import { vendorPublicRouter } from "./vendorRouter/publicRouter.js";
import vendorOrderRouter from "./vendorRouter/vendorOrderRouter.js";
import vendorShippingRouter from "./vendorShippingRouter.js";
import vendorPayoutRouter from "./vendorPayoutRouter.js";
import vendorOnboardingRouter from "./vendorOnboardingRouter.js";

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */

export const defaultRouter: Router = Router();

defaultRouter.use("/user", authRouter);
defaultRouter.use("/user", userRouter);
defaultRouter.use("/user", orderRouter);
defaultRouter.use("/user", purchaseRouter);
defaultRouter.use("/user", orderManagementRouter);
defaultRouter.use("/admin", adminRouter);
defaultRouter.use("/", productRouter);
defaultRouter.use("/", vendorPublicRouter);
defaultRouter.use("/vendor/orders", vendorOrderRouter);
defaultRouter.use("/vendor/shipping", vendorShippingRouter as any);
defaultRouter.use("/vendor/payout", vendorPayoutRouter as any);
defaultRouter.use("/vendor/onboarding", vendorOnboardingRouter as any);
defaultRouter.use("/shipping", shippingFulfillmentRouter);
defaultRouter.use("/", couponRouter);
defaultRouter.use("/stripe", stripeRouter);
defaultRouter.use("/content", contentRouter);
defaultRouter.use("/inventory", inventoryRouter);
defaultRouter.use("/returns", returnsRefundsRouter);
defaultRouter.use("/notifications", notificationRouter);
defaultRouter.use("/analytics", analyticsRouter);
defaultRouter.use("/bulk-uploader", uploadRouter);
