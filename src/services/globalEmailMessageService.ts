import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import reshttp from "reshttp";
import { HOST_EMAIL, HOST_EMAIL_SECRET, SMTP_HOST, SMTP_PORT } from "../configs/config.js";
import constant from "../constants/constant.js";
import logger from "../utils/loggerUtils.js";
import { replaceAllPlaceholders } from "../utils/replaceAllPlaceholders.js";
import { generateRandomStrings } from "../utils/slugStringGeneratorUtils.js";
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true,
  auth: {
    user: HOST_EMAIL,
    pass: HOST_EMAIL_SECRET
  }
});

export async function gloabalMailMessage(
  to: string,
  message?: string | null,
  subject?: string,
  header?: string,
  addsOn?: string,
  senderIntro?: string
) {
  const templatePath = path.resolve(__dirname, "../../templates/globalEmailMessageTemplate.html");
  let htmlTemplate = fs.readFileSync(templatePath, "utf8");
  const placeholders = {
    companyname: constant.COMPANY_NAME || "Prime Logic Solutions",
    senderIntro: senderIntro || "",
    message: message || "",
    header: header || "",
    addsOn: addsOn || ""
  };
  htmlTemplate = replaceAllPlaceholders(htmlTemplate, placeholders);
  const randomStr = generateRandomStrings(10);
  const mailOptions = {
    from: HOST_EMAIL,
    to: to,
    subject: subject ?? constant.COMPANY_NAME,
    html: htmlTemplate,
    headers: {
      "X-Auto-Response-Suppress": "All",
      Precedence: "bulk",
      "Auto-Submitted": "auto-generated",
      "Message-ID": `<${randomStr}.dev>`
    },

    replyTo: "support@primelogicsole.com"
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email message sent successfully: ${info.response}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error Email message sending :${error.message}`);
      throw { status: reshttp.internalServerErrorCode, message: reshttp.internalServerErrorMessage };
    }
    logger.error(`Error sending Email  message:${error as string}`, { error });
    throw { status: reshttp.internalServerErrorCode, message: reshttp.notImplementedMessage };
  }
}
