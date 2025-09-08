import type { User } from "@prisma/client";
import type { Response } from "express";
import constant from "../constants/constant.js";
import tokenGeneratorUtils, { type TPAYLOAD } from "./tokenGeneratorUtils.js";

export const payloadGenerator = ({ ...rest }: TPAYLOAD): TPAYLOAD => {
  return { ...rest };
};

export function setTokensAndCookies(user: User, res: Response, setRefreshToken = false, setAccessToken = true) {
  const payLoad = payloadGenerator({
    id: user.id,
    isVerified: user.isVerified,
    tokenVersion: user.tokenVersion
  });
  let accessToken: string | undefined = undefined;
  if (setAccessToken) {
    accessToken = tokenGeneratorUtils.generateAccessToken(payLoad, res) as string;
    res.cookie("accessToken", accessToken, constant.COOKIEOPTIONS.ACESSTOKENCOOKIEOPTIONS);
  }

  let refreshToken: string | undefined = undefined;
  if (setRefreshToken) {
    // Generate and send refresh token only if setRefreshToken is true
    refreshToken = tokenGeneratorUtils.generateRefreshToken(payLoad, res) as string;
    res.cookie("refreshToken", refreshToken, constant.COOKIEOPTIONS.REFRESHTOKENCOOKIEOPTIONS);
  }

  return {
    accessToken: setAccessToken ? accessToken : undefined,
    refreshToken: setRefreshToken ? refreshToken : undefined,
    payLoad
  };
}
