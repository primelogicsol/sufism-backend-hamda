import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TCONFERENCE_UPDATE, TCREATE_CONFERENCE_REGISTRATION } from "../../types/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  conferenceBook: asyncHandler(async (req: _Request, res) => {
    try {
      const data = req.body as TCREATE_CONFERENCE_REGISTRATION;
      const user = await db.user.findFirst({
        where: {
          id: req.userFromToken?.id
        }
      });
      if (!user) return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);

      const conference = await db.conference.create({
        data: {
          userId: user.id,
          institution: data.institution,
          abstract: data.abstract,
          presentationType: data.presentationType,
          topic: data.topic
        }
      });

      if (!conference) {
        return httpResponse(req, res, reshttp.internalServerErrorCode, "Conference not created", conference);
      }

      return httpResponse(req, res, reshttp.createdCode, "Conference created", conference);
    } catch (error) {
      logger.error("Error in conferenceBook:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Internal server error");
    }
  }),

  viewConferenceBook: asyncHandler(async (req: _Request, res) => {
    try {
      const user = await db.user.findFirst({
        where: {
          id: req.userFromToken?.id
        }
      });

      if (!user) {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }

      const status = req.query.status ? Number(req.query.status) : undefined;

      if (status !== undefined && isNaN(status)) {
        return httpResponse(req, res, 400, "Status must be a number");
      }

      const conferences = await db.conference.findMany({
        where: {
          userId: user.id,
          ...(status !== undefined ? { status } : {})
        }
      });

      if (!conferences.length) {
        return httpResponse(req, res, reshttp.okCode, "No conference found", []);
      }

      return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, conferences);
    } catch (error) {
      logger.error("Error in viewConferenceBook:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Internal server error");
    }
  }),

  updateConferenceStatus: asyncHandler(async (req: _Request, res) => {
    try {
      const { status } = req.body as TCONFERENCE_UPDATE;
      const user = await db.user.findFirst({
        where: {
          id: req.userFromToken?.id
        }
      });

      if (!user) {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }

      const updatedConference = await db.conference.update({
        where: {
          userId: user.id,
          status: 0,
          id: Number(req.params.id)
        },
        data: {
          status: status
        }
      });

      if (!updatedConference) {
        return httpResponse(req, res, reshttp.notFoundCode, reshttp.notFoundMessage);
      }

      return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, updatedConference);
    } catch (error) {
      logger.error("Error in updateConferenceStatus:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Internal server error");
    }
  })
};
