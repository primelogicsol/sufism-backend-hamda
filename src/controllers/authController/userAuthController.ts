import reshttp from "reshttp";
import constant from "../../constants/constant.js";

import { type User } from "@prisma/client";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { gloabalMailMessage } from "../../services/globalEmailMessageService.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";
import messageSenderUtils from "../../utils/messageSenderUtils.js";
import { passwordHasher, verifyPassword } from "../../utils/passwordHasherUtils.js";
import { setTokensAndCookies } from "../../utils/setTokenAndCookiesUtils.js";
import { generateOtp } from "../../utils/slugStringGeneratorUtils.js";
import { createStripeCustomer } from "../../utils/stripeCustomerId.js";
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
    const OTP_TOKEN = generateOtp();
    const hashedPassword = (await passwordHasher(body.password!, res)) as string;
    await db.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        password: hashedPassword,
        role: body.role ?? "user",
        OTP: OTP_TOKEN.otp,
        OTP_EXPIRES_IN: OTP_TOKEN.otpExpiry,
        isVerified: false
      }
    });
    try {
      await gloabalMailMessage(body.email, messageSenderUtils.urlSenderMessage(`${OTP_TOKEN.otp}`, `30m`));
    } catch (e) {
      logger.error(e);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "We couldn’t send the OTP email at this time. Please try again later.");
    }

    httpResponse(req, res, reshttp.createdCode, reshttp.createdMessage, {
      email: body.email
    });
  }),

  // ** Verify User Account through OTP
  verifyAccount: asyncHandler(async (req, res) => {
    const { email, OTP } = req.body as User;
    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      logger.warn(`OTP verification attempt for non-existent email: ${email}`);
      return httpResponse(req, res, reshttp.notFoundCode, "User not found");
    }

    // if (user.isVerified) {
    //     logger.warn(`Already verified account attempt: ${email}`);
    //     return httpResponse(req, res,reshttp.conflictCode, reshttp.conflictMessage);
    // }
    // Verify OTP match
    if (user.OTP !== OTP) {
      logger.warn(`Invalid OTP attempt for: ${email}`);
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check OTP expiry---then resend otp api helps
    if (!user.OTP_EXPIRES_IN || user.OTP_EXPIRES_IN < new Date()) {
      await db.user.update({
        where: { email },
        data: {
          OTP: null,
          OTP_EXPIRES_IN: null
        }
      });
      logger.warn(`Expired OTP attempt for: ${email}`);
      return httpResponse(req, res, reshttp.badRequestCode, "OTP expired. Please try again");
    }
    const customerId = await createStripeCustomer(user);
    const verifiedUser = await db.user.update({
      where: { email },
      data: {
        isVerified: true,
        OTP: null,
        OTP_EXPIRES_IN: null,
        tokenVersion: { increment: 1 },
        customer_id: customerId
      }
    });

    const { accessToken, refreshToken } = setTokensAndCookies(verifiedUser, res, true);

    logger.info(`User verified successfully: ${email}`);
    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
      accessToken,
      refreshToken,
      user: {
        email: verifiedUser.email,
        isVerified: verifiedUser.isVerified
      }
    });
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
      const OTP_TOKEN = generateOtp();
      await db.user.update({
        where: { email: user!.email },
        data: { OTP: OTP_TOKEN.otp, OTP_EXPIRES_IN: OTP_TOKEN.otpExpiry }
      });
      await gloabalMailMessage(body.email, messageSenderUtils.urlSenderMessage(`${OTP_TOKEN.otp}`, `30m`));
      httpResponse(req, res, reshttp.okCode, "Verification link is sent to you email ");
    }
    //for existing users if the customer id doesn't exists then create one
    const customerId = user?.customer_id;
    if (!customerId && user) {
      const newCustomerId = await createStripeCustomer({ id: user?.id, email: user?.email, fullName: user?.fullName });
      await db.user.update({
        where: { email: user.email },
        data: { customer_id: newCustomerId }
      });
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
    // if (user.isVerified) throw { status: reshttp.conflictCode, message: "Account is already verified" };
    const OTP_TOKEN = generateOtp();
    await db.user.update({
      where: { email: user.email },
      data: { OTP: OTP_TOKEN.otp, OTP_EXPIRES_IN: OTP_TOKEN.otpExpiry }
    });
    await gloabalMailMessage(
      constant.EMAILS.APP_EMAIL,
      user.email,
      undefined,
      messageSenderUtils.urlSenderMessage(`${OTP_TOKEN.otp}`, `30m`),
      "Account Verification request",
      `Hi, ${user.fullName}`
    );

    httpResponse(req, res, reshttp.okCode, "OTP sent to your email");
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
        const OTP_TOKEN = generateOtp();
        await db.user.update({
          where: { email: user.email },
          data: { OTP: OTP_TOKEN.otp, OTP_EXPIRES_IN: OTP_TOKEN.otpExpiry }
        });
        await gloabalMailMessage(
          constant.EMAILS.APP_EMAIL,
          user.email,
          undefined,
          messageSenderUtils.urlSenderMessage(`${OTP_TOKEN.otp}`, `30m`),
          "Account Verification request",
          `Hi, ${user.fullName}`
        );
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
  }),
  forgotPasswordRequest: asyncHandler(async (req, res) => {
    const { email } = req.body as User;
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return httpResponse(req, res, reshttp.notFoundCode, "User not found");
    }

    const OTP_TOKEN = generateOtp();
    //todo@ do we need to check otp expr before sending the new one
    await db.user.update({
      where: { email: user.email },
      data: { OTP: OTP_TOKEN.otp, OTP_EXPIRES_IN: OTP_TOKEN.otpExpiry }
    });
    await gloabalMailMessage(email, messageSenderUtils.urlSenderMessage(`${OTP_TOKEN.otp}`, `30m`));
    return httpResponse(req, res, reshttp.okCode, "Verification link is sent to you email ");
  }),
  passwordReset: asyncHandler(async (req, res) => {
    const { email, password } = req.body as User;
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return httpResponse(req, res, reshttp.notFoundCode, "User not found");
    }
    const hashedPassword = (await passwordHasher(password!, res)) as string;
    await db.user.update({
      where: { email: user.email },
      data: { password: hashedPassword }
    });
    return httpResponse(req, res, reshttp.okCode, "Password updated successfully");
  })
};
