import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  getVendorById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        businessName: true,
        businessLegalStructure: true,
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
        createdAt: true,
        isVerified: true
      }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.notFoundCode, "User not found");
    }
    return httpResponse(req, res, reshttp.okCode, "User fetched successfully", user);
  }),

  /**
   * Get vendor company profile
   */
  getVendorCompanyProfile: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const vendor = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          businessName: true,
          email: true,
          address: true,
          zipCode: true,
          city: true,
          state: true,
          country: true,
          phone: true,
          fullName: true,
          businessType: true,
          businessLegalStructure: true,
          contactPerson: true,
          isVerified: true,
          vendoraccepted: true,
          isCompleted: true,
          createdAt: true
        }
      });

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      if (vendor.role !== "vendor") {
        return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
      }

      return httpResponse(req, res, reshttp.okCode, "Vendor company profile retrieved successfully", vendor);
    } catch (error) {
      logger.error(`Error getting vendor company profile: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to retrieve vendor company profile");
    }
  }),

  /**
   * Update vendor company profile
   */
  updateVendorCompanyProfile: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { businessName, email, address, zipCode, city, state, country, phone, businessType, businessLegalStructure, contactPerson } = req.body as {
      businessName?: string;
      email?: string;
      address?: string;
      zipCode?: string;
      city?: string;
      state?: string;
      country?: string;
      phone?: string;
      businessType?: string;
      businessLegalStructure?: string;
      contactPerson?: string;
    };

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      // Check if vendor exists and has vendor role
      const existingVendor = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, email: true }
      });

      if (!existingVendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      if (existingVendor.role !== "vendor") {
        return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
      }

      // Check if email is being updated and if it's already in use
      if (email && email !== existingVendor.email) {
        const emailExists = await db.user.findFirst({
          where: {
            email,
            NOT: { id: userId }
          }
        });

        if (emailExists) {
          return httpResponse(req, res, reshttp.badRequestCode, "Email is already in use by another user");
        }
      }

      // Update vendor profile
      const updatedVendor = await db.user.update({
        where: { id: userId },
        data: {
          ...(businessName !== undefined && { businessName }),
          ...(email !== undefined && { email }),
          ...(address !== undefined && { address }),
          ...(zipCode !== undefined && { zipCode }),
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
          ...(country !== undefined && { country }),
          ...(phone !== undefined && { phone }),
          ...(businessType !== undefined && { businessType }),
          ...(businessLegalStructure !== undefined && { businessLegalStructure }),
          ...(contactPerson !== undefined && { contactPerson })
        },
        select: {
          id: true,
          businessName: true,
          email: true,
          address: true,
          zipCode: true,
          city: true,
          state: true,
          country: true,
          phone: true,
          fullName: true,
          businessType: true,
          businessLegalStructure: true,
          contactPerson: true,
          isVerified: true,
          vendoraccepted: true,
          isCompleted: true,
          createdAt: true
        }
      });

      logger.info(`Vendor company profile updated for user ${userId}`);

      return httpResponse(req, res, reshttp.okCode, "Vendor company profile updated successfully", updatedVendor);
    } catch (error) {
      logger.error(`Error updating vendor company profile: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update vendor company profile");
    }
  })
};
