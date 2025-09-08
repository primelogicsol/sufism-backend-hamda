import process from "node:process";
type TENV = "development" | "production" | "test";
const config = {
  PORT: process.env.PORT || 8001,
  ENV: process.env.NODE_ENV as TENV,
  JWT_SECRET: process.env.JWT_SECRET as string,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME as string,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD as string,
  HOST_EMAIL: process.env.SMTP_HOST_EMAIL as string,
  HOST_EMAIL_SECRET: process.env.SMTP_SECRET as string,
  FRONTEND_APP_URL: process.env.FRONTEND_APP_URL as string,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "465"),
  SMTP_HOST: process.env.SMTP_HOST as string,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
    ? process.env.CLOUDINARY_API_SECRET
    : "Unable to fetch CLOUDINARY_API_SECRET from .env file",
  STRIPE_SK: process.env.STRIPE_SK as string,
  CLOUDINARY_NAME: process.env.CLOUDINARY_NAME ? process.env.CLOUDINARY_NAME : "Unable to fetch CLOUDINARY_NAME from .env file",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY : "Unable to fetch CLOUDINARY_API_KEY from .env file"
};
export const {
  PORT,
  ENV,
  JWT_SECRET,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  HOST_EMAIL,
  HOST_EMAIL_SECRET,
  FRONTEND_APP_URL,
  SMTP_PORT,
  SMTP_HOST,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_NAME,
  STRIPE_SK,
  CLOUDINARY_API_KEY
} = config;
