import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TCREATE_CONFERENCE_REGISTRATION } from "../../types/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

export default {
  conferenceBook: asyncHandler(async (req: _Request, res) => {
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
      httpResponse(req, res, reshttp.internalServerErrorCode, "conference not created", conference);
    }
    httpResponse(req, res, reshttp.createdCode, "conference created", conference);
  }),
  viewConferenceBook: asyncHandler(async (req: _Request, res) => {
    const user = await db.user.findFirst({
      where: {
        id: req.userFromToken?.id
      }
    });
    if (!user) return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    const interView = await db.conference.findMany({
      where: {
        userId: user.id,
        status: 1
      }
    });
    if (!interView.length) return httpResponse(req, res, reshttp.okCode, "No Conference found", interView);
    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, interView);
  }),

  conferenceBookCancel: asyncHandler(async (req: _Request, res) => {
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
        status: 2
      }
    });

    if (!updatedConference) httpResponse(req, res, reshttp.okCode, "No pending conference found to cancel");

    return httpResponse(req, res, reshttp.okCode, "conference cancelled", updatedConference);
  })
};
