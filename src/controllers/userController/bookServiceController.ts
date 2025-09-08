import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TBOOK_SERVICE } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  bookService: asyncHandler(async (req: _Request, res) => {
    const data = req.body as TBOOK_SERVICE;
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const booking = await db.bookService.create({
      data: {
        userId: user.id,
        subject: data.subject,
        service: data.service,
        date: data.date,
        comment: data.comment ?? ""
      }
    });

    if (!booking) {
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to book service");
    }
    return httpResponse(req, res, reshttp.createdCode, "Booking created", booking);
  }),
  viewServiceBooking: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({
      where: { id: userId }
    });
    if (!user) {
      logger.info("Unauthorize user");
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const booking = await db.bookService.findMany({
      where: {
        userId: user.id
      }
    });
    if (!booking) {
      logger.info("Booking not fount");
      return httpResponse(req, res, reshttp.notFoundCode, "Booking not found");
    }
    logger.info("Booking fetched");
    logger.info(booking);
    return httpResponse(req, res, reshttp.acceptedCode, "Booking fetched", booking);
  })
};
