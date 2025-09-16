import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import { gloabalMailMessage } from "../../services/globalEmailMessageService.js";
import type { VendorRegistrationInput } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";
import messageSenderUtils from "../../utils/messageSenderUtils.js";
import { passwordHasher } from "../../utils/passwordHasherUtils.js";
import { generateOtp } from "../../utils/slugStringGeneratorUtils.js";

export default {
  register: asyncHandler(async (req, res) => {
    const body = req.body as VendorRegistrationInput;
    // ** validation is already handled by  middleware
    const user = await db.user.findFirst({
      where: {
        email: body.email
      }
    });
    if (user) httpResponse(req, res, reshttp.badRequestCode, "User already exists with same email.");
    const OTP_TOKEN = generateOtp();
    const hashedPassword = (await passwordHasher(body.password, res)) as string;
    await db.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        password: hashedPassword,
        role: "vendor",
        OTP: OTP_TOKEN.otp,
        OTP_EXPIRES_IN: OTP_TOKEN.otpExpiry,
        // isVerified: true,
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
    try {
      await gloabalMailMessage(body.email, messageSenderUtils.urlSenderMessage(`${OTP_TOKEN.otp}`, `30m`));
    } catch (e) {
      logger.error(e);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "We couldn’t send the OTP email at this time. Please try again later.");
    }

    httpResponse(req, res, reshttp.createdCode, "Please veridy email first", {
      email: body.email
    });
  })
};
