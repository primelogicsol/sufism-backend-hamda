import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import resthhtp from "reshttp";
import { JWT_SECRET } from "../configs/config.js";

export const adminAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const auth = req.header("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.substring(7) : "";
    if (!token) throw { status: resthhtp.unauthorizedCode, message: resthhtp.unauthorizedMessage } as { status: number; message: string };
    const payload = jwt.verify(token, JWT_SECRET) as { role?: string };
    if (payload?.role !== "admin")
      throw { status: resthhtp.forbiddenCode, message: resthhtp.forbiddenMessage } as { status: number; message: string };
    return next();
  } catch (e) {
    const err = (e as { status?: number; message?: string }) ?? { status: resthhtp.unauthorizedCode, message: resthhtp.unauthorizedMessage };
    return next(err);
  }
};
