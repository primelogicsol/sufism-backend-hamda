import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TCREATE_INTERVIEW_REQUEST } from "../../types/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

export default {
  interviewBook: asyncHandler(async (req: _Request, res) => {
    const data = req.body as TCREATE_INTERVIEW_REQUEST;
    const user = await db.user.findFirst({
      where: {
        id: req.userFromToken?.id
      }
    });
    if (!user) return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    const interView = await db.interview.create({
      data: {
        userId: user.id,
        institution: data.institution,
        profession: data.profession,
        website: data.website,
        spiritualOrientation: data.spiritualOrientation,
        publicVoice: data.publicVoice,
        interviewIntent: data.interviewIntent,
        areasOfImpact: data.areasOfImpact,
        interviewTimeZone: data.interviewTimeZone,
        scheduledAt: new Date(data.scheduledAt),
        additionalNotes: data.additionalNotes
      }
    });
    if (!interView) {
      return httpResponse(req, res, reshttp.internalServerErrorCode, "interView not created", interView);
    }

    return httpResponse(req, res, reshttp.createdCode, "interView created", interView);
  }),
  // possiblenew
  interviewBookView: asyncHandler(async (req: _Request, res) => {
    const user = await db.user.findFirst({
      where: {
        id: req.userFromToken?.id
      }
    });
    if (!user) return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    const interView = await db.interview.findMany({
      where: {
        userId: user.id,
        status: 1
      }
    });
    if (!interView.length) return httpResponse(req, res, reshttp.okCode, "No interviews found", interView);
    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, interView);
  }),
  interviewBookCancel: asyncHandler(async (req: _Request, res) => {
    const user = await db.user.findFirst({
      where: {
        id: req.userFromToken?.id
      }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const updatedInterview = await db.interview.update({
      where: {
        userId: user.id,
        status: 0,
        id: Number(req.params.id)
      },
      data: {
        status: 2
      }
    });

    if (!updatedInterview) httpResponse(req, res, reshttp.okCode, "No pending interview found to cancel");

    return httpResponse(req, res, reshttp.okCode, "Interview cancelled", updatedInterview);
  })
};
