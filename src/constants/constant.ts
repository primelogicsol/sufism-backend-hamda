import type cors from "cors";
import { ENV, HOST_EMAIL } from "../configs/config.js";
import type { ICOOKIEOPTIONS } from "../types/types.js";

export default {
  COMPANY_NAME: "PrimeLogics",
  DEFAULT_ENDPOINT: "/api/v1",
  EMAILS: {
    WHITE_LIST_EMAILS: ["hamda2k23@gmail.com"],
    APP_EMAIL: HOST_EMAIL
  },
  COOKIEOPTIONS: {
    ACESSTOKENCOOKIEOPTIONS: {
      httpOnly: true,
      secure: ENV === "production",
      sameSite: "none",
      expires: new Date(Date.now() + 14 * 60 * 1000) // 14 minutes in milliseconds
    } as ICOOKIEOPTIONS,
    REFRESHTOKENCOOKIEOPTIONS: {
      httpOnly: true,
      secure: ENV === "production",
      sameSite: "none",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days in milliseconds
    } as ICOOKIEOPTIONS
  },
  USER_SELECT: {
    SELECT: {
      userID: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      isVerified: true,
      tokenVersion: true,
      createdAt: true
    }
  }
};

const CORS_ORIGIN = ["https://ssc-hubbah-arshads-projects.vercel.app/", "http://localhost:3000/"];
export const corsOptions: cors.CorsOptions = {
  origin: CORS_ORIGIN,
  credentials: true,
  // allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
};
