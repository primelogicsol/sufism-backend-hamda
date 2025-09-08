import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TCONTACT_US } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

export default {
  contactUs: asyncHandler(async (req: _Request, res) => {
    const data = req.body as TCONTACT_US;
    const user = await db.user.findFirst({
      where: {
        id: req.userFromToken?.id
      }
    });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const newContact = await db.contactUs.create({
      data: {
        userId: user.id,
        message: data.message,
        subject: data.subject
      }
    });

    if (!newContact) {
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to submit contact request");
    }
    return httpResponse(req, res, reshttp.createdCode, reshttp.createdMessage, newContact);
  })
};
