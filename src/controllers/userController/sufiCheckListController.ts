import { ChecklistItemStatus } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TCreateSufiChecklistRequest } from "../../types/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

export default {
  createChecklist: asyncHandler(async (req: _Request, res) => {
    try {
      const user = await db.user.findFirst({
        where: { id: req.userFromToken?.id }
      });

      if (!user) {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }

      const data = req.body as TCreateSufiChecklistRequest;
      const { completeAll = false, resetAll = false } = data;
      const existingChecklist = await db.sufiChecklist.findFirst({
        where: { userId: user.id },
        include: { items: true }
      });
      const statusToApply = resetAll ? ChecklistItemStatus.PENDING : completeAll ? ChecklistItemStatus.COMPLETED : ChecklistItemStatus.PENDING;
      if (existingChecklist) {
        const existingTitles = new Set(existingChecklist.items.map((i) => i.title));
        const newItems = data.items.filter((item) => !existingTitles.has(item.title));
        if (resetAll) {
          await db.sufiChecklistItem.updateMany({
            where: { checklistId: existingChecklist.id },
            data: { status: ChecklistItemStatus.PENDING }
          });
        } else if (completeAll) {
          await db.sufiChecklistItem.updateMany({
            where: { checklistId: existingChecklist.id },
            data: { status: ChecklistItemStatus.COMPLETED }
          });
        }

        await db.sufiChecklist.update({
          where: { id: existingChecklist.id },
          data: {
            progress: data.progress,
            items: {
              create: newItems.map((item) => ({
                section: item.section,
                title: item.title,
                status: statusToApply
              }))
            }
          }
        });

        return httpResponse(req, res, reshttp.okCode, "Checklist updated successfully");
      } else {
        await db.sufiChecklist.create({
          data: {
            user: { connect: { id: user.id } },
            progress: data.progress,
            items: {
              create: data.items.map((item) => ({
                section: item.section,
                title: item.title,
                status: completeAll ? ChecklistItemStatus.COMPLETED : (item.status ?? ChecklistItemStatus.PENDING)
              }))
            }
          }
        });

        return httpResponse(req, res, reshttp.createdCode, "Checklist created successfully");
      }
    } catch (error) {
      console.error("Checklist error:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Something went wrong", {
        error: (error as Error).message
      });
    }
  }),

  getChecklist: asyncHandler(async (req: _Request, res) => {
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });
    if (!user) return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);

    const checklist = await db.sufiChecklist.findFirst({
      where: { userId: user.id },
      include: { items: true }
    });

    if (!checklist) return httpResponse(req, res, reshttp.okCode, "No checklist found", []);

    return httpResponse(req, res, reshttp.okCode, "Checklist found", checklist);
  })
};
