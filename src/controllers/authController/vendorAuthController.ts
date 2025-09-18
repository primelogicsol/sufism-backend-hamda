import type { User } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import { gloabalMailMessage } from "../../services/globalEmailMessageService.js";
import type { VendorRegistrationInput } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";
import messageSenderUtils from "../../utils/messageSenderUtils.js";
import { passwordHasher, verifyPassword } from "../../utils/passwordHasherUtils.js";
import { setTokensAndCookies } from "../../utils/setTokenAndCookiesUtils.js";

export default {
  register: asyncHandler(async (req, res) => {
    const body = req.body as VendorRegistrationInput;
    const { id } = req.params;

    try {
      // Case 1: If ID is provided → must update
      if (id) {
        const existingUser = await db.user.findUnique({ where: { id } });
        if (!existingUser) {
          return httpResponse(req, res, reshttp.badRequestCode, "Invalid ID");
        }

        const updatedUser = await db.user.update({
          where: { id },
          data: {
            ...body,
            password: body.password ? ((await passwordHasher(body.password, res)) as string) : existingUser.password
          }
        });

        if (body.isCompleted) {
          await gloabalMailMessage(updatedUser.email, messageSenderUtils.vendorApprovalMessage());
          return httpResponse(req, res, reshttp.okCode, "Mail sent successfully");
        }

        return httpResponse(req, res, reshttp.okCode, "User updated successfully", { id: updatedUser.id });
      } else if (!body.email) {
        return httpResponse(req, res, reshttp.badRequestCode, reshttp.badRequestMessage);
      }

      // Case 2: No ID → check email
      const existingUser = await db.user.findFirst({ where: { email: body.email } });

      if (existingUser) {
        // Update user with incoming data
        const updatedUser = await db.user.update({
          where: { email: body.email },
          data: {
            ...body,
            password: body.password ? ((await passwordHasher(body.password, res)) as string) : existingUser.password
          }
        });

        if (body.isCompleted) {
          await gloabalMailMessage(updatedUser.email, messageSenderUtils.vendorApprovalMessage());
          // return httpResponse(req, res, reshttp.okCode, "Mail sent successfully");
        }

        return httpResponse(req, res, reshttp.okCode, "User updated successfully", { id: updatedUser.id });
      } else {
        // Create new user
        let hashedPassword: string | undefined;
        if (body.password) {
          hashedPassword = (await passwordHasher(body.password, res)) as string;
        }
        const newUser = await db.user.create({
          data: {
            fullName: body.fullName,
            email: body.email,
            ...(hashedPassword && { password: hashedPassword }),
            role: "vendor",
            businessName: body.businessName,
            businessType: body.businessType,
            einNumber: body.einNumber,
            tinNumber: body.tinNumber,
            contactPerson: body.contactPerson,
            phone: body.phone,
            bankName: body.bankName,
            accountNumber: body.accountNumber,
            routingNumber: body.routingNumber,
            bankAddress: body.bankAddress,
            signatoryName: body.signatoryName,
            signatureDate: body.signatureDate,
            vendoraccepted: body.vendoraccepted
          }
        });

        if (body.isCompleted) {
          await gloabalMailMessage(newUser.email, messageSenderUtils.vendorApprovalMessage());
          return httpResponse(req, res, reshttp.createdCode, "Mail sent successfully");
        }

        return httpResponse(req, res, reshttp.createdCode, "User created successfully", { id: newUser.id });
      }
    } catch (e) {
      logger.error(e);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Something went wrong.");
    }
  }),
  login: asyncHandler(async (req, res) => {
    const body = req.body as User;

    const user = await db.user.findUnique({ where: { email: body.email } });
    if (!user) {
      httpResponse(req, res, reshttp.notFoundCode, "User not found");
      return;
    }

    const userPassword: string = typeof user?.password === "string" ? user.password : "";
    const isPasswordValid = await verifyPassword(body.password!, userPassword, res);
    if (!isPasswordValid) {
      logger.info("Password is incorrect");
      throw { status: reshttp.unauthorizedCode, message: reshttp.unauthorizedMessage };
    } else if (!user.isCompleted) {
      httpResponse(req, res, reshttp.partialContentCode, "Please complete your profile first");
      return;
    }

    const { accessToken, refreshToken } = setTokensAndCookies(user, res, true);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { accessToken, refreshToken });
  }),
  getVendor: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        businessName: true,
        businessType: true,
        einNumber: true,
        tinNumber: true,
        contactPerson: true,
        phone: true,
        bankName: true,
        accountNumber: true,
        routingNumber: true,
        bankAddress: true,
        signatoryName: true,
        signatureDate: true,
        vendoraccepted: true,
        isCompleted: true,
        createdAt: true
      }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.notFoundCode, "User not found");
    }

    return httpResponse(req, res, reshttp.okCode, "User fetched successfully", user);
  })
};
