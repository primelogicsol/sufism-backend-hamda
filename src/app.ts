import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
// import { STRIPE_SK } from "./configs/config.js";
import { corsOptions } from "./constants/constant.js";
import endPoints from "./constants/endPoints.js";
import PerformanceController from "./controllers/performanceController/performanceController.js";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";
import { defaultRouter } from "./routers/defaultRouter.js";
import stripeController from "./controllers/stripeController/stripeController.js";
export const app: Application = express();
// const stripe = require("stripe")(STRIPE_SK);
//  * Default Middlewares

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));

// ⬇️ Webhook route FIRST with express.raw()
app.use("/v1/stripe/webhook", express.raw({ type: "application/json" }), stripeController.webhook);

app.use(express.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.resolve(__dirname, "../public")));
app.get("/", PerformanceController.getPerformance);
// * Custom Middlewares
app.use(endPoints.DEFAULT_ENDPOINT, defaultRouter);
// * Error handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);
