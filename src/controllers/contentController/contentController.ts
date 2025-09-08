import type { Request, Response } from "express";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import { ContentService, ContentItemSchema } from "../../services/content.service.js";

const getList = asyncHandler(async (req: Request, res: Response) => {
  const { section } = req.params as { section: string };
  const data: unknown = await ContentService.getList(section);
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  return httpResponse(req, res, 200, "ok", data);
});

const getItem = asyncHandler(async (req: Request, res: Response) => {
  const { section, slug } = req.params as { section: string; slug: string };
  const data = await ContentService.getItem(section, slug);
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  return httpResponse(req, res, 200, "ok", data);
});

const getItemByVersion = asyncHandler(async (req: Request, res: Response) => {
  const { section, slug, version } = req.params as { section: string; slug: string; version: string };
  const versionNum = parseInt(version);
  if (isNaN(versionNum) || versionNum < 1) {
    return httpResponse(req, res, 400, "Invalid version number", null);
  }
  const data = await ContentService.getItemByVersion(section, slug, versionNum);
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  return httpResponse(req, res, 200, "ok", data);
});

const getAvailableVersions = asyncHandler(async (req: Request, res: Response) => {
  const { section, slug } = req.params as { section: string; slug: string };
  const versions = await ContentService.getAvailableVersions(section, slug);
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  return httpResponse(req, res, 200, "ok", { versions });
});

const putItem = asyncHandler(async (req: Request, res: Response) => {
  const { section, slug } = req.params as { section: string; slug: string };
  const data = await ContentService.upsertItem(section, slug, req.body);
  return httpResponse(req, res, 200, "saved", data);
});

const validateItem = asyncHandler(async (req: Request, res: Response) => {
  const parsed = ContentItemSchema.parse(req.body);
  // Small awaited noop to satisfy require-await lint rule
  await Promise.resolve();
  return httpResponse(req, res, 200, "valid", parsed as unknown);
});

const bulkSave = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as unknown;
  const items = Array.isArray(body) ? (body as unknown[]) : [body];
  const saved: unknown[] = [];
  for (const raw of items) {
    const parsed = ContentItemSchema.parse(raw);
    const result = await ContentService.upsertItem(parsed.section, parsed.slug, parsed);
    saved.push(result);
  }
  // Ensure indexes contain entries for uploaded items
  await ContentService.reindex();
  return httpResponse(req, res, 200, "saved", { count: saved.length });
});

export default { getList, getItem, getItemByVersion, getAvailableVersions, putItem, validateItem, bulkSave };
