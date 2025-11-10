import { z } from "zod";
import { NotificationType, NotificationPriority, NotificationStatus } from "@prisma/client";

export const createNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  priority: z.nativeEnum(NotificationPriority).default("NORMAL"),
  data: z.any().optional(),
  orderId: z.number().positive().optional(),
  returnId: z.number().positive().optional(),
  shipmentId: z.number().positive().optional(),
  expiresAt: z.string().datetime().optional()
});

export const getUserNotificationsSchema = z.object({
  type: z.nativeEnum(NotificationType).optional(),
  status: z.nativeEnum(NotificationStatus).optional(),
  isRead: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
});

export const createNotificationTemplateSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  priority: z.nativeEnum(NotificationPriority).default("NORMAL"),
  variables: z.array(z.string()).optional()
});

export const updateNotificationPreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        type: z.nativeEnum(NotificationType),
        emailEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        webSocketEnabled: z.boolean().optional()
      })
    )
    .min(1, "At least one preference is required")
});

export const broadcastSystemNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  priority: z.nativeEnum(NotificationPriority).default("NORMAL"),
  data: z.any().optional()
});

export const notificationAnalyticsSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
  type: z.nativeEnum(NotificationType).optional()
});
