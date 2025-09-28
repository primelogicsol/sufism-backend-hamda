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
interface CloudinaryFile extends Express.Multer.File {
  path: string; // Cloudinary URL
  filename: string; // Cloudinary public_id
  resource_type?: string;
  duration?: number;
  bytes?: number;
  public_id?: string;
  format?: string;
  secure_url?: string;
}
type MulterFiles = Record<string, CloudinaryFile[]>;

export default {
  register: asyncHandler(async (req, res) => {
    logger.info("register api is called");
    const body = req.body as VendorRegistrationInput;
    const files = req.files as MulterFiles;
    const uploadedImages =
      files?.vendorNic?.map((img) => ({
        url: img.path,
        format: img.format || null,
        bytes: img.bytes || null
      })) || [];
    const { id } = req.params;

    try {
      // Case 1: If ID is provided → must update
      if (id) {
        const existingUser = await db.user.findUnique({ where: { id } });
        if (!existingUser) {
          return httpResponse(req, res, reshttp.badRequestCode, "Invalid ID");
        }
        if (body.email) {
          const emailExists = await db.user.findFirst({
            where: {
              email: body.email,
              NOT: { id } // exclude current user
            }
          });

          if (emailExists) {
            return httpResponse(req, res, reshttp.badRequestCode, "Email is already in use");
          }
        }

        const updatedUser = await db.user.update({
          where: { id },
          data: {
            ...body,
            ...(typeof body.isCompleted !== "undefined" && { isCompleted: Boolean(body.isCompleted) }),
            ...(typeof body.vendoraccepted !== "undefined" && { vendoraccepted: Boolean(body.vendoraccepted) }),
            vendorNic: body.isCompleted && uploadedImages.length ? uploadedImages[0].url : existingUser.vendorNic || null,
            password: body.password ? ((await passwordHasher(body.password, res)) as string) : existingUser.password
          }
        });

        if (body.isCompleted) {
          try {
            await gloabalMailMessage(updatedUser.email, messageSenderUtils.vendorApprovalMessage());
            return httpResponse(req, res, reshttp.okCode, "Mail sent successfully");
          } catch (e) {
            logger.info(e);
            return httpResponse(req, res, reshttp.okCode, "We will contact you soon");
          }
        }

        return httpResponse(req, res, reshttp.okCode, "User updated successfully", { id: updatedUser.id });
      } else if (!body.email) {
        return httpResponse(req, res, reshttp.badRequestCode, reshttp.badRequestMessage);
      }

      // Case 2: No ID → check email
      const existingUser = await db.user.findFirst({ where: { email: body.email } });
      if (existingUser && !id) {
        return httpResponse(req, res, reshttp.badRequestCode, "User with the same email already exists");
      }
      if (existingUser) {
        // Update user with incoming data
        const updatedUser = await db.user.update({
          where: { email: body.email },
          data: {
            ...body,
            ...(uploadedImages && { vendorNic: uploadedImages[0].url }),
            password: body.password ? ((await passwordHasher(body.password, res)) as string) : existingUser.password
          }
        });

        if (body.isCompleted) {
          try {
            await gloabalMailMessage(updatedUser.email, messageSenderUtils.vendorApprovalMessage());
            return httpResponse(req, res, reshttp.okCode, "Mail sent successfully");
          } catch (e) {
            logger.error(e);
            return httpResponse(req, res, reshttp.okCode, "We will contact you soon");
          }
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
            role: "vendor"
          }
        });

        if (body.isCompleted) {
          try {
            await gloabalMailMessage(newUser.email, messageSenderUtils.vendorApprovalMessage());
            return httpResponse(req, res, reshttp.createdCode, "Mail sent successfully");
          } catch (e) {
            logger.info(e);
            return httpResponse(req, res, reshttp.okCode, "We will contact you soon");
          }
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
    if (!user.password) {
      httpResponse(req, res, reshttp.badRequestCode, "User Password is not set yet");
      return;
    }
    const isPasswordValid = await verifyPassword(body.password!, user.password, res);
    if (!isPasswordValid) {
      logger.info("Password is incorrect");
      throw { status: reshttp.unauthorizedCode, message: reshttp.unauthorizedMessage };
    } else if (!user.isCompleted) {
      httpResponse(req, res, reshttp.partialContentCode, "Please complete your profile first");
      return;
    }

    const { accessToken, refreshToken } = setTokensAndCookies(user, res, true);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, { accessToken, refreshToken });
  })

  //  registerVendor : asyncHandler(async (req, res) => {
  //   const { fullName, email, password } = req.body as IREGISTER;

  //   // 1. Hash password if provided
  //  let hashedPassword: string | undefined;
  //         if (password) {
  //           hashedPassword = (await passwordHasher(password, res)) as string;
  //         }
  //   // 2. Create Stripe Connected Account
  //   const account = await stripe.accounts.create({
  //     type: "express", // "standard" also works, depends on UX
  //     country: "US",   // can be dynamic based on user input
  //     email,
  //     capabilities: {
  //       card_payments: { requested: true },
  //       transfers: { requested: true }
  //     }
  //   });

  //   // 4. Generate onboarding link
  //   const accountLink = await stripe.accountLinks.create({
  //     account: account.id,
  //     refresh_url: BASE_URL,
  //     return_url:`${BASE_URL}thank_you`,
  //     type: "account_onboarding"
  //   });

  //   // 3. Save user in DB with stripeAccountId
  //   const newUser = await db.user.create({
  //     data: {
  //       fullName,
  //       email,
  //       password: hashedPassword,
  //       stripeMerchantId: account.id
  //     }
  //   });
  //   return httpResponse(req, res, reshttp.createdCode, "Vendor created successfully", {
  //     id: newUser.id,
  //     stripeAccountId: account.id,
  //     onboardingUrl: accountLink.url
  //   });
  // }),
  // onboardVendor: asyncHandler(async (req, res) => {
  //   const { email } = req.body as LoginInput; // or from JWT session

  //   const user = await db.user.findUnique({ where: { email: email } });
  //   if (!user) {
  //     return httpResponse(req, res, reshttp.notFoundCode, "User not found");
  //   }

  //   let stripeAccountId = user.stripeMerchantId;

  //   // If user has no Stripe account yet → create one
  //   if (!stripeAccountId) {
  //     const account = await stripe.accounts.create({
  //       type: "express",
  //       country: "US",
  //       email: user.email,
  //       capabilities: {
  //         card_payments: { requested: true },
  //         transfers: { requested: true }
  //       }
  //     });

  //     await db.user.update({
  //       where: { id: user.id },
  //       data: { stripeMerchantId: account.id }
  //     });

  //     stripeAccountId = account.id;
  //   }

  //   // Always generate onboarding link
  //   const accountLink = await stripe.accountLinks.create({
  //     account: stripeAccountId,
  //     refresh_url: `${BASE_URL}/vendor/reauth`,
  //     return_url: `${BASE_URL}/vendor/thank_you`,
  //     type: "account_onboarding"
  //   });

  //   return httpResponse(req, res, reshttp.okCode, "Stripe onboarding link created", {
  //     onboardingUrl: accountLink.url
  //   });
  // }),
};
