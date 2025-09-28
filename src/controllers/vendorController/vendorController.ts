import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

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
  })
};
