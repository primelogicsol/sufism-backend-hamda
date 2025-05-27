import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TPROFILE } from "../../types/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  viewUserProfile: asyncHandler(async (req: _Request, res) => {
    try {
      // Find user by ID from token
      const user = await db.user.findFirst({
        where: { id: req.userFromToken?.id },
        select: {
          id: true,
          fullName: true,
          lastName: true,
          email: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
          phone: true
        }
      });

      if (!user) {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }

      // Return user profile data
      return httpResponse(req, res, reshttp.okCode, "Profile retrieved successfully", { profile: user });
    } catch (error) {
      logger.error("Error fetching user profile:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Error retrieving profile");
    }
  }),

  updateUserProfile: asyncHandler(async (req: _Request, res) => {
    const data = req.body as Partial<TPROFILE>;
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);

    try {
      const updateResult = await db.user.update({
        where: { id: user.id },
        data: {
          fullName: data.fullName,
          lastName: data.lastName,
          address: data.address,
          city: data.city,
          country: data.country,
          state: data.state,
          zipCode: data.zipCode,
          phone: data.phone
        }
      });

      if (updateResult) {
        return httpResponse(req, res, reshttp.okCode, reshttp.okMessage);
      } else {
        return httpResponse(req, res, reshttp.badRequestCode, "Failed to update profile");
      }
    } catch (error) {
      logger.error("Error fetching products:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Error updating profile");
    }
  })
};
