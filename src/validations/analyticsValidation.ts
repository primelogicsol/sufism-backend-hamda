import { z } from "zod";
import { ReportType, ReportFormat, ReportStatus, DashboardWidgetType } from "@prisma/client";

export const salesAnalyticsSchema = z.object({
  vendorId: z.string().optional(),
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
  groupBy: z.enum(["day", "week", "month"]).default("day")
});

export const inventoryAnalyticsSchema = z.object({
  vendorId: z.string().optional(),
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d")
});

export const customerAnalyticsSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d")
});

export const vendorAnalyticsSchema = z.object({
  vendorId: z.string().optional(),
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d")
});

export const createReportSchema = z.object({
  name: z.string().min(1, "Report name is required"),
  type: z.nativeEnum(ReportType),
  format: z.nativeEnum(ReportFormat),
  parameters: z
    .object({
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      userId: z.string().optional(),
      vendorId: z.string().optional(),
      productId: z.number().positive().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
      groupBy: z.string().optional(),
      metrics: z.array(z.string()).optional(),
      filters: z.record(z.any()).optional()
    })
    .optional()
});

export const getUserReportsSchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  type: z.nativeEnum(ReportType).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
});

export const createDashboardSchema = z.object({
  name: z.string().min(1, "Dashboard name is required"),
  description: z.string().optional(),
  widgets: z
    .array(
      z.object({
        type: z.nativeEnum(DashboardWidgetType),
        title: z.string().min(1, "Widget title is required"),
        description: z.string().optional(),
        position: z.number().int().positive(),
        size: z.enum(["small", "medium", "large"]).default("medium"),
        configuration: z.record(z.any()).optional(),
        refreshInterval: z.number().int().positive().default(300)
      })
    )
    .optional()
});

export const updateDashboardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  layout: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  widgets: z
    .array(
      z.object({
        type: z.nativeEnum(DashboardWidgetType),
        title: z.string().min(1),
        description: z.string().optional(),
        position: z.number().int().positive(),
        size: z.enum(["small", "medium", "large"]).default("medium"),
        configuration: z.record(z.any()).optional(),
        refreshInterval: z.number().int().positive().default(300)
      })
    )
    .optional()
});

export const trackEventSchema = z.object({
  eventType: z.string().min(1, "Event type is required"),
  eventName: z.string().min(1, "Event name is required"),
  properties: z.record(z.any()).optional(),
  sessionId: z.string().optional()
});

export const analyticsOverviewSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d")
});
