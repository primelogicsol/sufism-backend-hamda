import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TDONORSHIP } from "../../types/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  donation: asyncHandler(async (req: _Request, res) => {
    const data = req.body as TDONORSHIP;
    const user = await db.user.findFirst({
      where: {
        id: req.userFromToken?.id
      }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const existingDonation = await db.donation.findFirst({
      where: {
        userId: user.id
      }
    });

    if (existingDonation) {
      return httpResponse(req, res, reshttp.conflictCode, "Donation already exists", existingDonation);
    }
    if (!req.userFromToken?.id) {
      throw new Error("User ID is missing from token");
    }
    const donor = await db.donation.create({
      data: {
        userId: req.userFromToken?.id,
        amount: data.amount,
        donorType: data.type,
        pool: data.pool
      }
    });

    if (!donor) {
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create donor");
    }

    logger.info("Donation created");
    return httpResponse(req, res, reshttp.createdCode, "Donor created", donor);
  }),
  viewDonation: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({
      where: { id: userId }
    });
    if (!user) {
      logger.info("Unauthorize user");
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const donation = await db.donation.findFirst({
      where: {
        userId: user.id
      }
    });
    if (!donation) {
      logger.info("Donation not fount");
      return httpResponse(req, res, reshttp.notFoundCode, "Donation not found");
    }
    logger.info("Donation fetched");
    logger.info(donation);
    return httpResponse(req, res, reshttp.acceptedCode, "Donation fetched", donation);
  }),
  updateDonation: asyncHandler(async (req: _Request, res) => {
    const data = req.body as Partial<TDONORSHIP>;
    const user = await db.user.findFirst({
      where: {
        id: req.userFromToken?.id
      }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const existingDonation = await db.donation.findFirst({
      where: {
        userId: user.id
      }
    });

    if (!existingDonation) {
      return httpResponse(req, res, reshttp.notFoundCode, "Donation not found");
    }

    const updatedDonation = await db.donation.update({
      where: {
        id: existingDonation.id
      },
      data: {
        amount: data.amount ?? existingDonation.amount,
        pool: data.pool ?? existingDonation.pool,
        donorType:data.type?? existingDonation.donorType
      }
    });

    return httpResponse(req, res, reshttp.okCode, "Donation updated", updatedDonation);
  }),
  deleteDonation: asyncHandler(async (req: _Request, res) => {
    const user = await db.user.findFirst({
      where: {
        id: req.userFromToken?.id
      }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const existingDonation = await db.donation.findFirst({
      where: {
        userId: user.id
      }
    });

    if (!existingDonation) {
      return httpResponse(req, res, reshttp.notFoundCode, "Donation not found");
    }

    // Delete the member
    await db.donation.delete({
      where: {
        id: existingDonation.id
      }
    });

    return httpResponse(req, res, reshttp.okCode, "Donation deleted successfully");
  })
};
