import type { Request, Response } from "express";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import { SufiSaintService, SufiSaintSchema, type SufiSaintInput } from "../../services/sufiSaint.service.js";

const getAll = asyncHandler(async (req: Request, res: Response) => {
  const { period, century, tag, search } = req.query as {
    period?: string;
    century?: string;
    tag?: string;
    search?: string;
  };

  const data = await SufiSaintService.getAll({
    period,
    century,
    tag,
    search
  });

  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  return httpResponse(req, res, 200, "ok", data);
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return httpResponse(req, res, 400, "Invalid ID", null);
  }

  const data = await SufiSaintService.getById(id);

  if (!data) {
    return httpResponse(req, res, 404, "Sufi Saint not found", null);
  }

  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  return httpResponse(req, res, 200, "ok", data);
});

const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await SufiSaintService.create(req.body as SufiSaintInput);
  return httpResponse(req, res, 201, "created", data);
});

const update = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return httpResponse(req, res, 400, "Invalid ID", null);
  }

  const data = await SufiSaintService.update(id, req.body as Partial<SufiSaintInput>);
  return httpResponse(req, res, 200, "updated", data);
});

const deleteSaint = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return httpResponse(req, res, 400, "Invalid ID", null);
  }

  await SufiSaintService.delete(id);
  return httpResponse(req, res, 200, "deleted", null);
});

const validate = asyncHandler(async (req: Request, res: Response) => {
  const parsed = SufiSaintSchema.parse(req.body);
  // Small awaited noop to satisfy require-await lint rule
  await Promise.resolve();
  return httpResponse(req, res, 200, "valid", parsed as unknown);
});

const getPeriods = asyncHandler(async (req: Request, res: Response) => {
  const periods = await SufiSaintService.getPeriods();
  return httpResponse(req, res, 200, "ok", { periods });
});

const getCenturies = asyncHandler(async (req: Request, res: Response) => {
  const centuries = await SufiSaintService.getCenturies();
  return httpResponse(req, res, 200, "ok", { centuries });
});

const getTags = asyncHandler(async (req: Request, res: Response) => {
  const tags = await SufiSaintService.getTags();
  return httpResponse(req, res, 200, "ok", { tags });
});

export default {
  getAll,
  getById,
  create,
  update,
  deleteSaint,
  validate,
  getPeriods,
  getCenturies,
  getTags
};
