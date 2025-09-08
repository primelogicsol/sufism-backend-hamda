import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { gloabalMailMessage } from "../../services/globalEmailMessageService.js";
import type { InterviewRequestBody, TCREATE_INTERVIEW_REQUEST } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";
import messageSenderUtils from "../../utils/messageSenderUtils.js";

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
    try {
      await gloabalMailMessage(user.email, messageSenderUtils.interviewScheduleMessage());
    } catch (e) {
      logger.error(e);
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
        id: Number(req.params.id) //tht particular interview id
      },
      data: {
        status: 2
      }
    });

    if (!updatedInterview) httpResponse(req, res, reshttp.okCode, "No pending interview found to cancel");

    return httpResponse(req, res, reshttp.okCode, "Interview cancelled", updatedInterview);
  }),

  acceptInterview: asyncHandler(async (req: _Request, res) => {
    const data = req.body as InterviewRequestBody;
    const user = await db.user.findFirst({
      where: {
        id: req.userFromToken?.id ///admin id
      }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const updatedInterview = await db.interview.update({
      where: {
        status: 0,
        id: Number(req.params.id) ///interviewId for accepting that particular user
      },
      data: {
        status: 1,
        scheduledAt: new Date(data.interviewHeldDate)
      }
    });

    if (!updatedInterview) httpResponse(req, res, reshttp.notFoundCode, reshttp.notFoundMessage);
    try {
      const userDetails = await db.user.findFirst({
        where: {
          id: updatedInterview.userId
        }
      });
      await gloabalMailMessage(userDetails?.email ?? "", messageSenderUtils.interviewScheduleMessage());
    } catch (e) {
      logger.error(e);
    }
    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, updatedInterview);
  })
};
