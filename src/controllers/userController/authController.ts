import reshttp from "reshttp";
import constant from "../../constants/constant.js";

import { type User } from "@prisma/client";
import { FRONTEND_APP_URL } from "../../configs/config.js";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { gloabalMailMessage } from "../../services/globalEmailMessageService.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";
import messageSenderUtils from "../../utils/messageSenderUtils.js";
import { passwordHasher, verifyPassword } from "../../utils/passwordHasherUtils.js";
import { setTokensAndCookies } from "../../utils/setTokenAndCookiesUtils.js";
import { defineExpireyTime, generateRandomStrings } from "../../utils/slugStringGeneratorUtils.js";
import tokenGeneratorUtils, { type TPAYLOAD } from "../../utils/tokenGeneratorUtils.js";
export default {
  register: asyncHandler(async (req, res) => {
    const body = req.body as User;
    // ** validation is already handled by  middleware
    const user = await db.user.findFirst({
      where: {
        email: body.email
      }
    });
    if (user) httpResponse(req, res, reshttp.badRequestCode, "User already exists with same email.");
    const OTP_TOKEN = generateRandomStrings(40);
    const OTP_TOKEN_EXPIRES_IN = defineExpireyTime(4, "h");
    const hashedPassword = (await passwordHasher(body.password!, res)) as string;
    await db.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        password: hashedPassword,
        OTP: OTP_TOKEN,
        OTP_EXPIRES_IN: OTP_TOKEN_EXPIRES_IN,
        isVerified: false
      }
    });
    try {
      await gloabalMailMessage(body.email, messageSenderUtils.urlSenderMessage(`${FRONTEND_APP_URL}/verify?token=${OTP_TOKEN}`, "4h"));
    } catch (e) {
      logger.error(e);
    }

    httpResponse(req, res, reshttp.createdCode, reshttp.createdMessage, {
      email: body.email
    });
  }),

  // ** Verify User Account through OTP
  verifyAccount: asyncHandler(async (req, res) => {
    const { token } = req.query;
    if (!token) httpResponse(req, res, 400, "Please provide token");
    const user = await db.user.findUnique({ where: { OTP: token as string } });
    if (!user) throw { status: reshttp.notFoundCode, message: reshttp.notFoundMessage };
    if (user.OTP === null) {
      logger.warn("Account is already verified");
      throw { status: reshttp.conflictCode, message: reshttp.conflictMessage };
    }
    // ** check if token is expired
    if (user.OTP_EXPIRES_IN && user.OTP_EXPIRES_IN < new Date()) {
      await db.user.update({
        where: { email: user.email },
        data: { OTP: null, OTP_EXPIRES_IN: null }
      });
      logger.warn("Token is expired");
      throw { status: reshttp.unauthorizedCode, message: reshttp.unauthorizedMessage };
    }
    const verifiedUser = await db.user.update({
      where: { email: user.email },
      data: { isVerified: true, OTP: null, OTP_EXPIRES_IN: null, tokenVersion: { increment: 1 } }
    });
    const { accessToken, refreshToken } = setTokensAndCookies(verifiedUser, res, true);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { accessToken, refreshToken });
  }),
  // ** login user through password after the verification of his/her account
  login: asyncHandler(async (req, res) => {
    const body = req.body as User;

    const user = await db.user.findUnique({ where: { email: body.email } });
    if (!user) {
      httpResponse(req, res, reshttp.notFoundCode, "User not found");
    }

    const isPasswordValid = await verifyPassword(body.password!, user!.password || "", res);
    if (!isPasswordValid) {
      logger.info("Password is incorrect");
      throw { status: reshttp.unauthorizedCode, message: reshttp.unauthorizedMessage };
    } else if (!user!.isVerified) {
      const OTP_TOKEN = generateRandomStrings(40);
      const OTP_TOKEN_EXPIRES_IN = defineExpireyTime(4, "h");
      await db.user.update({
        where: { email: user!.email },
        data: { OTP: OTP_TOKEN, OTP_EXPIRES_IN: OTP_TOKEN_EXPIRES_IN }
      });
      await gloabalMailMessage(body.email, messageSenderUtils.urlSenderMessage(`${FRONTEND_APP_URL}/verify?token=${OTP_TOKEN}`, "4h"));
      httpResponse(req, res, reshttp.okCode, "Verification link is sent to you email ");
    }
    const { accessToken, refreshToken } = setTokensAndCookies(user!, res, true);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { accessToken, refreshToken });
  }),
  // ** RefreshAccessToken
  refreshAccessToken: asyncHandler(async (req: _Request, res) => {
    const refreshToken = req.header("Authorization")?.split("Bearer ")[1];

    if (!refreshToken) throw { status: reshttp.badRequestCode, message: "Please provide refresh token" };

    const [error, decoded] = tokenGeneratorUtils.verifyToken<TPAYLOAD>(refreshToken);

    if (error) {
      logger.error("Error while verifying token");
      throw { status: reshttp.unauthorizedCode, message: reshttp.unauthorizedMessage };
    }

    if (!decoded?.id) {
      logger.warn("Invalid token. Not uid found in accessToken");
      throw { status: reshttp.unauthorizedCode, message: reshttp.unauthorizedMessage };
    }

    const user = await db.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      logger.warn("Invalid token. User not found");
      throw { status: reshttp.unauthorizedCode, message: reshttp.unauthorizedMessage };
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      logger.error("Invalid token. tokenVersion doesn't match maybe session is expired");
      throw { status: reshttp.unauthorizedCode, message: "Session expired. Please login again" };
    }
    const { accessToken, refreshToken: newRefreshToken } = setTokensAndCookies(user, res, true);
    httpResponse(req, res, reshttp.okCode, "Token refreshed successfully", { accessToken, refreshToken: newRefreshToken });
  }),
  resendOTPLink: asyncHandler(async (req, res) => {
    const { email } = req.body as User;
    if (!email) {
      logger.info("Please provide email");
      throw { status: reshttp.badRequestCode, message: reshttp.badRequestMessage };
    }
    const user = await db.user.findUnique({ where: { email: email } });
    if (!user) throw { status: reshttp.notFoundCode, message: reshttp.notFoundMessage };
    if (user.isVerified) throw { status: reshttp.conflictCode, message: "Account is already verified" };
    const OTP_TOKEN = generateRandomStrings(40);
    const OTP_TOKEN_EXPIRES_IN = defineExpireyTime(4, "h");
    await db.user.update({
      where: { email: user.email },
      data: { OTP: OTP_TOKEN, OTP_EXPIRES_IN: OTP_TOKEN_EXPIRES_IN }
    });
    await gloabalMailMessage(
      constant.EMAILS.APP_EMAIL,
      user.email,
      undefined,
      //     messageSender(`${FRONTEND_APP_URL}/auth/verify?token=${OTP_TOKEN}`, "4h").OTP_SENDER_MESSAGE,
      messageSenderUtils.urlSenderMessage(`${FRONTEND_APP_URL}/auth/verify?token=${OTP_TOKEN}`, "4h"),
      "Account Verification request",
      `Hi, ${user.fullName}`
    );
    httpResponse(req, res, reshttp.okCode, "Please verify your account using the link sent to your email");
  }),
  // ** Logout user and clear cookie
  logout: asyncHandler(async (req: _Request, res) => {
    const userID = req.userFromToken?.id;
    res
      .clearCookie("refreshToken", constant.COOKIEOPTIONS.REFRESHTOKENCOOKIEOPTIONS)
      .clearCookie("accessToken", constant.COOKIEOPTIONS.ACESSTOKENCOOKIEOPTIONS);
    await db.user.update({ where: { id: userID }, data: { tokenVersion: { increment: 1 } } });
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage);
  }),

  // social login
  googleAuth: asyncHandler(async (req, res) => {
    const body = req.body as User;

    let user = await db.user.findUnique({ where: { email: body.email } });

    if (!user) {
      user = await db.user.create({
        data: {
          fullName: body.fullName,
          email: body.email,
          isVerified: true,
          authProvider: "google",
          password: null
        }
      });

      logger.info(`New user created via Google Auth: ${body.email}`);
    } else {
      if (user.authProvider === "credentials" && !user.isVerified) {
        // email send
        return httpResponse(req, res, reshttp.unauthorizedCode, "Email verification required");
      }

      if (user.isVerified && user.authProvider !== "google") {
        user = await db.user.update({
          where: { email: body.email },
          data: {
            authProvider: "google"
          }
        });
      }
    }

    const { accessToken, refreshToken } = setTokensAndCookies(user, res, true);
    logger.info("Google login successful");
    httpResponse(req, res, reshttp.okCode, "Google login successful", {
      accessToken,
      refreshToken
    });
  })
};
