import type { NextFunction, Request, Response } from "express";
import resthhtp from "reshttp";
import { db } from "../configs/database.js";
import { verifyToken } from "../services/verifyTokenServics.js";
import { asyncHandler } from "../utils/asyncHandlerUtils.js";
import logger from "../utils/loggerUtils.js";
import type { TPAYLOAD } from "../utils/tokenGeneratorUtils.js";

export type _Request = Request & {
  userFromToken?: TPAYLOAD;
};
export default {
  checkToken: asyncHandler(async (req: _Request, _: Response, next: NextFunction) => {
    const accessToken = req.header("Authorization");
    if (!accessToken) {
      logger.error("No access token found", "authMiddleware.ts:13");
      throw { status: resthhtp.unauthorizedCode, message: resthhtp.unauthorizedMessage };
    }
    const parsedToken = accessToken?.split(" ")[1] || "";
    if (!parsedToken) {
      logger.error(
        `Invalid access token. It seems Bearer is not attached with the Token or maybe check the spelling of Bearer`,
        parsedToken,
        "authMiddleware.ts:18"
      );
      throw { status: resthhtp.unauthorizedCode, message: resthhtp.unauthorizedMessage };
    }
    const [error, decoded] = verifyToken<TPAYLOAD>(parsedToken);
    if (error) {
      logger.error(`Error while verifying token :: ${String(parsedToken)}`, "authMiddleware.ts:24");
      throw { status: resthhtp.unauthorizedCode, message: resthhtp.unauthorizedMessage };
    }
    if (!decoded?.id) {
      logger.warn("Invalid token. Not id found in accessToken", "authMiddleware.ts:28");
      throw { status: resthhtp.unauthorizedCode, message: resthhtp.unauthorizedMessage };
    }
    const user = await db.user.findUnique({ where: { id: decoded.id } });
    if (user?.tokenVersion !== decoded.tokenVersion) {
      logger.error("Invalid token. tokenVersion doesn't match maybe session is expired", "authMiddleware.ts:33");
      throw { status: resthhtp.unauthorizedCode, message: "Session expired. Please login again" };
    }
    if (decoded.isVerified == null) {
      logger.error("user is not verified", "authMiddleware.ts:36");
      throw { status: resthhtp.forbiddenCode, message: resthhtp.forbiddenMessage };
    }

    req.userFromToken = decoded;
    return next();
  })
};
