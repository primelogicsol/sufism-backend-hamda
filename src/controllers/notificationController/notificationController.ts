import { NotificationType, NotificationPriority, NotificationStatus } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { NotificationService } from "../../services/notification.service.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  /**
   * Create notification
   */
  createNotification: asyncHandler(async (req: _Request, res) => {
    const { userId, type, title, message, priority, data, orderId, returnId, shipmentId, expiresAt } = req.body;
    const currentUserId = req.userFromToken?.id;

    if (!currentUserId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!userId || !type || !title || !message) {
      return httpResponse(req, res, reshttp.badRequestCode, "Required fields are missing");
    }

    try {
      const notificationData = {
        userId,
        type: type as NotificationType,
        title,
        message,
        priority: priority as NotificationPriority || "NORMAL",
        data,
        orderId: orderId ? parseInt(orderId) : undefined,
        returnId: returnId ? parseInt(returnId) : undefined,
        shipmentId: shipmentId ? parseInt(shipmentId) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      };

      const result = await NotificationService.createNotification(notificationData);
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.notification);
    } catch (error) {
      logger.error(`Error creating notification: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create notification");
    }
  }),

  /**
   * Get user notifications
   */
  getUserNotifications: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { type, status, isRead, page = "1", limit = "20" } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const result = await NotificationService.getUserNotifications(userId, {
        type: type as NotificationType,
        status: status as NotificationStatus,
        isRead: isRead ? isRead === "true" : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
      
      return httpResponse(req, res, reshttp.okCode, "Notifications retrieved successfully", result);
    } catch (error) {
      logger.error(`Error getting user notifications: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get notifications");
    }
  }),

  /**
   * Mark notification as read
   */
  markAsRead: asyncHandler(async (req: _Request, res) => {
    const { notificationId } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const result = await NotificationService.markAsRead(parseInt(notificationId), userId);
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message);
    } catch (error) {
      logger.error(`Error marking notification as read: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to mark notification as read");
    }
  }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      await db.notification.updateMany({
        where: { userId, isRead: false },
        data: {
          isRead: true,
          readAt: new Date(),
          status: "READ"
        }
      });

      logger.info(`All notifications marked as read for user ${userId}`);
      
      return httpResponse(req, res, reshttp.okCode, "All notifications marked as read");
    } catch (error) {
      logger.error(`Error marking all notifications as read: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to mark all notifications as read");
    }
  }),

  /**
   * Delete notification
   */
  deleteNotification: asyncHandler(async (req: _Request, res) => {
    const { notificationId } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const notification = await db.notification.findFirst({
        where: { id: parseInt(notificationId), userId }
      });

      if (!notification) {
        return httpResponse(req, res, reshttp.notFoundCode, "Notification not found");
      }

      await db.notification.delete({
        where: { id: parseInt(notificationId) }
      });

      logger.info(`Notification ${notificationId} deleted by user ${userId}`);
      
      return httpResponse(req, res, reshttp.okCode, "Notification deleted successfully");
    } catch (error) {
      logger.error(`Error deleting notification: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to delete notification");
    }
  }),

  /**
   * Get notification analytics
   */
  getNotificationAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { period = "30d", type } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const analytics = await NotificationService.getNotificationAnalytics({
        userId,
        period: period as "7d" | "30d" | "90d" | "1y",
        type: type as NotificationType
      });
      
      return httpResponse(req, res, reshttp.okCode, "Notification analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting notification analytics: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get notification analytics");
    }
  }),

  /**
   * Create notification template
   */
  createNotificationTemplate: asyncHandler(async (req: _Request, res) => {
    const { type, title, message, priority, variables } = req.body;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check if user is admin
    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "admin") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Admin role required.");
    }

    if (!type || !title || !message) {
      return httpResponse(req, res, reshttp.badRequestCode, "Type, title, and message are required");
    }

    try {
      const templateData = {
        type: type as NotificationType,
        title,
        message,
        priority: priority as NotificationPriority || "NORMAL",
        variables: variables || []
      };

      const result = await NotificationService.createNotificationTemplate(templateData);
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.template);
    } catch (error) {
      logger.error(`Error creating notification template: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create notification template");
    }
  }),

  /**
   * Get notification templates
   */
  getNotificationTemplates: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check if user is admin
    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "admin") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Admin role required.");
    }

    try {
      const templates = await db.notificationTemplate.findMany({
        orderBy: { createdAt: "desc" }
      });
      
      return httpResponse(req, res, reshttp.okCode, "Notification templates retrieved successfully", templates);
    } catch (error) {
      logger.error(`Error getting notification templates: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get notification templates");
    }
  }),

  /**
   * Update notification preferences
   */
  updateNotificationPreferences: asyncHandler(async (req: _Request, res) => {
    const { preferences } = req.body;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!preferences || !Array.isArray(preferences)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Preferences array is required");
    }

    try {
      const result = await NotificationService.updateNotificationPreferences(userId, preferences);
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message);
    } catch (error) {
      logger.error(`Error updating notification preferences: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update notification preferences");
    }
  }),

  /**
   * Get notification preferences
   */
  getNotificationPreferences: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const preferences = await db.notificationPreference.findMany({
        where: { userId },
        orderBy: { type: "asc" }
      });
      
      return httpResponse(req, res, reshttp.okCode, "Notification preferences retrieved successfully", preferences);
    } catch (error) {
      logger.error(`Error getting notification preferences: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get notification preferences");
    }
  }),

  /**
   * Broadcast system notification
   */
  broadcastSystemNotification: asyncHandler(async (req: _Request, res) => {
    const { type, title, message, priority, data } = req.body;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check if user is admin
    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "admin") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Admin role required.");
    }

    if (!type || !title || !message) {
      return httpResponse(req, res, reshttp.badRequestCode, "Type, title, and message are required");
    }

    try {
      const result = await NotificationService.broadcastSystemNotification(
        type as NotificationType,
        title,
        message,
        priority as NotificationPriority || "NORMAL",
        data
      );
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message);
    } catch (error) {
      logger.error(`Error broadcasting system notification: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to broadcast system notification");
    }
  }),

  /**
   * Get WebSocket connection status
   */
  getConnectionStatus: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const connections = await db.webSocketConnection.findMany({
        where: { userId, isActive: true },
        orderBy: { lastPingAt: "desc" }
      });

      const activeConnections = NotificationService.getActiveConnections();
      const userConnections = activeConnections.filter(conn => conn.userId === userId);

      return httpResponse(req, res, reshttp.okCode, "Connection status retrieved successfully", {
        totalConnections: connections.length,
        activeConnections: userConnections.length,
        lastPingAt: connections[0]?.lastPingAt,
        connections: userConnections
      });
    } catch (error) {
      logger.error(`Error getting connection status: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get connection status");
    }
  }),

  /**
   * Clean up expired notifications (admin only)
   */
  cleanupExpiredNotifications: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check if user is admin
    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "admin") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Admin role required.");
    }

    try {
      const result = await NotificationService.cleanupExpiredNotifications();
      
      return httpResponse(req, res, reshttp.okCode, result.message, {
        deletedCount: result.deletedCount
      });
    } catch (error) {
      logger.error(`Error cleaning up expired notifications: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to cleanup expired notifications");
    }
  }),

  /**
   * Retry failed notifications (admin only)
   */
  retryFailedNotifications: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check if user is admin
    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "admin") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Admin role required.");
    }

    try {
      const result = await NotificationService.retryFailedNotifications();
      
      return httpResponse(req, res, reshttp.okCode, result.message, {
        retriedCount: result.retriedCount
      });
    } catch (error) {
      logger.error(`Error retrying failed notifications: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to retry failed notifications");
    }
  })
};
