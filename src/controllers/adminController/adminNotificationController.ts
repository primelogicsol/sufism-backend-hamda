import type { Request, Response } from "express";
import reshttp from "reshttp";
import type { NotificationType, NotificationPriority } from "@prisma/client";
import { NotificationService } from "../../services/notification.service.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  /**
   * Create notification template (Admin JWT Auth)
   */
  createNotificationTemplate: asyncHandler(async (req: Request, res: Response) => {
    const { type, title, message, priority, variables } = req.body as {
      type?: string;
      title?: string;
      message?: string;
      priority?: string;
      variables?: string[];
    };

    if (!type || !title || !message) {
      return httpResponse(req, res, reshttp.badRequestCode, "Type, title, and message are required");
    }

    // Validate notification type
    const validTypes = [
      "ORDER_CREATED",
      "ORDER_UPDATED",
      "ORDER_CANCELLED",
      "ORDER_SHIPPED",
      "ORDER_DELIVERED",
      "PAYMENT_SUCCESS",
      "PAYMENT_FAILED",
      "PAYMENT_REFUNDED",
      "INVENTORY_LOW_STOCK",
      "INVENTORY_OUT_OF_STOCK",
      "RETURN_REQUESTED",
      "RETURN_APPROVED",
      "RETURN_REJECTED",
      "RETURN_PROCESSED",
      "REFUND_PROCESSED",
      "SHIPMENT_CREATED",
      "SHIPMENT_UPDATED",
      "SHIPMENT_DELIVERED",
      "COUPON_EXPIRED",
      "COUPON_CREATED",
      "VENDOR_APPROVED",
      "VENDOR_REJECTED",
      "SYSTEM_MAINTENANCE",
      "SECURITY_ALERT",
      "GENERAL"
    ];

    if (!validTypes.includes(type)) {
      return httpResponse(req, res, reshttp.badRequestCode, `Invalid notification type. Valid types: ${validTypes.join(", ")}`);
    }

    // Validate priority
    const validPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
    if (priority && !validPriorities.includes(priority)) {
      return httpResponse(req, res, reshttp.badRequestCode, `Invalid priority. Valid priorities: ${validPriorities.join(", ")}`);
    }

    try {
      const templateData = {
        type: type as NotificationType,
        title: title || "",
        message: message || "",
        priority: (priority as NotificationPriority) || "NORMAL",
        variables: variables || []
      };

      const result = await NotificationService.createNotificationTemplate(templateData);

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.template);
    } catch (error) {
      logger.error(`Error creating notification template: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create notification template");
    }
  }),

  /**
   * Get notification templates (Admin JWT Auth)
   */
  getNotificationTemplates: asyncHandler(async (req: Request, res: Response) => {
    try {
      const templates = await NotificationService.getNotificationTemplates();
      return httpResponse(req, res, reshttp.okCode, "Notification templates retrieved successfully", templates);
    } catch (error) {
      logger.error(`Error getting notification templates: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get notification templates");
    }
  }),

  /**
   * Broadcast system notification (Admin JWT Auth)
   */
  broadcastSystemNotification: (req: Request, res: Response) => {
    const { type, title, message, priority, data } = req.body as {
      type?: string;
      title?: string;
      message?: string;
      priority?: string;
      data?: unknown;
    };

    if (!type || !title || !message) {
      httpResponse(req, res, reshttp.badRequestCode, "Type, title, and message are required");
      return;
    }

    // Validate notification type
    const validTypes = [
      "ORDER_CREATED",
      "ORDER_UPDATED",
      "ORDER_CANCELLED",
      "ORDER_SHIPPED",
      "ORDER_DELIVERED",
      "PAYMENT_SUCCESS",
      "PAYMENT_FAILED",
      "PAYMENT_REFUNDED",
      "INVENTORY_LOW_STOCK",
      "INVENTORY_OUT_OF_STOCK",
      "RETURN_REQUESTED",
      "RETURN_APPROVED",
      "RETURN_REJECTED",
      "RETURN_PROCESSED",
      "REFUND_PROCESSED",
      "SHIPMENT_CREATED",
      "SHIPMENT_UPDATED",
      "SHIPMENT_DELIVERED",
      "COUPON_EXPIRED",
      "COUPON_CREATED",
      "VENDOR_APPROVED",
      "VENDOR_REJECTED",
      "SYSTEM_MAINTENANCE",
      "SECURITY_ALERT",
      "GENERAL"
    ];

    if (!validTypes.includes(type)) {
      httpResponse(req, res, reshttp.badRequestCode, `Invalid notification type. Valid types: ${validTypes.join(", ")}`);
      return;
    }

    // Validate priority
    const validPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
    if (priority && !validPriorities.includes(priority)) {
      httpResponse(req, res, reshttp.badRequestCode, `Invalid priority. Valid priorities: ${validPriorities.join(", ")}`);
      return;
    }

    try {
      const result = NotificationService.broadcastSystemNotification(
        type as NotificationType,
        title || "",
        message || "",
        (priority as NotificationPriority) || "NORMAL",
        data
      );

      if (!result.success) {
        httpResponse(req, res, reshttp.badRequestCode, result.message);
        return;
      }

      httpResponse(req, res, reshttp.okCode, result.message);
    } catch (error) {
      logger.error(`Error broadcasting system notification: ${String(error)}`);
      httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to broadcast system notification");
    }
  },

  /**
   * Get WebSocket connection status (Admin JWT Auth)
   */
  getConnectionStatus: (req: Request, res: Response) => {
    try {
      const status = NotificationService.getConnectionStatus();
      httpResponse(req, res, reshttp.okCode, "Connection status retrieved successfully", status);
    } catch (error) {
      logger.error(`Error getting connection status: ${String(error)}`);
      httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get connection status");
    }
  },

  /**
   * Clean up expired notifications (Admin JWT Auth)
   */
  cleanupExpiredNotifications: asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await NotificationService.cleanupExpiredNotifications();

      return httpResponse(req, res, reshttp.okCode, result.message, {
        deletedCount: result.deletedCount
      });
    } catch (error) {
      logger.error(`Error cleaning up expired notifications: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to cleanup expired notifications");
    }
  }),

  /**
   * Retry failed notifications (Admin JWT Auth)
   */
  retryFailedNotifications: asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await NotificationService.retryFailedNotifications();

      return httpResponse(req, res, reshttp.okCode, result.message, {
        retryCount: result.retriedCount
      });
    } catch (error) {
      logger.error(`Error retrying failed notifications: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to retry failed notifications");
    }
  })
};
