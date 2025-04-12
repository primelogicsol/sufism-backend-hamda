import DotenvFlow from "dotenv-flow";
import process from "node:process";
type TENV = "development" | "production" | "test";
DotenvFlow.config();
const config = {
  PORT: process.env.PORT || 8001,
  ENV: process.env.NODE_ENV as TENV,
  JWT_SECRET: process.env.JWT_SECRET as string,
  HOST_EMAIL: process.env.SMTP_HOST_EMAIL as string,
  HOST_EMAIL_SECRET: process.env.SMTP_SECRET as string,
  FRONTEND_APP_URL: process.env.FRONTEND_APP_URL as string,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "465"),
  SMTP_HOST: process.env.SMTP_HOST as string
};
export const { PORT, ENV, JWT_SECRET, HOST_EMAIL, HOST_EMAIL_SECRET, FRONTEND_APP_URL, SMTP_PORT, SMTP_HOST } = config;
