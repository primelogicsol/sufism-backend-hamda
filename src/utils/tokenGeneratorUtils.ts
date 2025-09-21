import type { Response } from "express";
import jwt from "jsonwebtoken";
import { ENV, JWT_SECRET } from "../configs/config.js";

export type TPAYLOAD = {
  id: string;
  tokenVersion: number;
  isVerified: boolean;
};

export default {
  generateAccessToken: (payload: TPAYLOAD, res: Response, expiresIn?: string): string | Response => {
    try {
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn || ENV === "development" ? "195m" : "195m" });
      return `${token}`;
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(500).json({
          success: false,
          message: error.message || "Internal server Error while generating access token",
          status: 500
        });

      return res.status(500).json({
        success: false,
        message: (error as string) || "Internal server Error while generating access token",
        status: 500
      });
    }
  },
  generateRefreshToken: (payload: TPAYLOAD, res: Response): string | Response => {
    try {
      const token = jwt.sign({ id: payload.id, tokenVersion: payload.tokenVersion }, JWT_SECRET, { expiresIn: "7d" });
      return `${token}`;
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(500).json({
          success: false,
          message: error.message || "Internal server Error while generating access token",
          status: 500
        });
      return res.status(500).json({
        success: false,
        message: (error as string) || "Internal server Error while generating access token",
        status: 500
      });
    }
  },
  verifyToken: <T>(token: string, secret: string = JWT_SECRET): [Error | null, T | null] => {
    try {
      const decoded = jwt.verify(token, secret) as T;
      return [null, decoded];
    } catch (error: unknown) {
      if (error instanceof Error) return [new Error(error.message || `Invalid Token::${error}`), null];
      return [Error(`Internal server error while verifying token :: ${error as string}`), null];
    }
  }
};
