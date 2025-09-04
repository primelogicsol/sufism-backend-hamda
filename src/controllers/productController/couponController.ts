import type { Prisma } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TAPPLY_COUPON, TCREATE_COUPON, TUPDATE_COUPON } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  createCoupon: asyncHandler(async (req: _Request, res) => {
    try {
      const data = req.body as TCREATE_COUPON;

      // Validate user existence
      const user = await db.user.findFirst({
        where: { id: req.userFromToken?.id }
      });

      if (!user) {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }

      const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null; // Create the coupon

      if (expiresAt && isNaN(expiresAt.getTime())) {
        return httpResponse(req, res, reshttp.forbiddenCode, "Invalid Expire Date format");
      }
      const coupon = await db.coupon.create({
        data: {
          code: data.code,
          discount: Number(data.discount),
          price: Number(data.price),
          expiresAt: expiresAt,
          isActive: true,
          createdBy: user.id
        }
      });

      if (!coupon) {
        return httpResponse(req, res, reshttp.internalServerErrorCode, "Coupon not created");
      }

      return httpResponse(req, res, reshttp.createdCode, "Coupon created", coupon);
    } catch (error: unknown) {
      logger.error(error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Internal server error");
    }
  }),
  // list of single genrator coups vender
  viewCoupons: asyncHandler(async (req: _Request, res) => {
    try {
      const user = await db.user.findFirst({
        where: { id: req.userFromToken?.id }
      });

      if (!user) {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }

      const coupons = await db.coupon.findMany({
        where: { createdBy: user.id }
      });

      if (!coupons.length) {
        return httpResponse(req, res, reshttp.okCode, "No coupons found", []);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const safeCoupons = coupons.map(({ code, ...rest }) => rest);

      return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, safeCoupons);
    } catch (error) {
      logger.error("Error in viewCoupons:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Internal server error");
    }
  }),

  applyCoupon: asyncHandler(async (req: _Request, res) => {
    try {
      const { code } = req.body as TAPPLY_COUPON;

      const coupon = await db.coupon.findFirst({
        where: { code: code.toUpperCase(), isActive: true }
      });

      if (!coupon) {
        return httpResponse(req, res, reshttp.notFoundCode, "Coupon not found or inactive");
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return httpResponse(req, res, reshttp.badRequestCode, "Coupon expired");
      }

      return httpResponse(req, res, reshttp.okCode, "Coupon applied", { discount: coupon.discount });
    } catch (error) {
      logger.error("Error in applyCoupon:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Internal server error");
    }
  }),

  updateCoupon: asyncHandler(async (req: _Request, res) => {
    try {
      const { id } = req.params;
      const data = req.body as TUPDATE_COUPON;

      const user = await db.user.findFirst({
        where: { id: req.userFromToken?.id }
      });

      if (!user) {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }
      const updateData: Prisma.CouponUpdateInput = {};

      const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

      if (expiresAt && isNaN(expiresAt.getTime())) {
        return httpResponse(req, res, reshttp.forbiddenCode, "Invalid Expire Date format");
      }
      if (data.code) updateData.code = data.code;
      if (data.expiresAt) updateData.expiresAt = expiresAt;
      if (data.discount) updateData.discount = data.discount;
      if (data.price) updateData.price = data.price;
      if (data.isActive && data.isActive != undefined) updateData.isActive = data.isActive == "true";
      const updatedCoupon = await db.coupon.update({
        where: { id: id, createdBy: user.id },
        data: updateData
      });

      if (!updatedCoupon) {
        return httpResponse(req, res, reshttp.notFoundCode, reshttp.notFoundMessage);
      }

      return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, updatedCoupon);
    } catch (error) {
      logger.error("Error in updateCoupon:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Internal server error");
    }
  }),

  deleteCoupon: asyncHandler(async (req: _Request, res) => {
    try {
      const { id } = req.params;

      const user = await db.user.findFirst({
        where: { id: req.userFromToken?.id }
      });

      if (!user) {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }

      await db.coupon.delete({
        where: { id: id, createdBy: user.id }
      });

      return httpResponse(req, res, reshttp.okCode, "Coupon deleted");
    } catch (error) {
      logger.error("Error in deleteCoupon:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Internal server error");
    }
  }),
  viewAllCoupons: asyncHandler(async (req: _Request, res) => {
    try {
      const user = await db.user.findFirst({
        where: { id: req.userFromToken?.id }
      });

      if (!user) {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }

      const coupons = await db.coupon.findMany({
        where: { isActive: true }
      });

      if (!coupons.length) {
        return httpResponse(req, res, reshttp.okCode, "No coupons found", []);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const safeCoupons = coupons.map(({ code, ...rest }) => rest);
      return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, safeCoupons);
    } catch (error) {
      logger.error("Error in viewCoupons:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Internal server error");
    }
  })
};
