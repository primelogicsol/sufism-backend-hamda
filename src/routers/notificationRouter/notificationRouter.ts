import { Router } from "express";
import notificationController from "../../controllers/notificationController/notificationController.js";

export const notificationRouter: Router = Router();

// Notification management routes
notificationRouter.post("/", notificationController.createNotification);
notificationRouter.get("/", notificationController.getUserNotifications);
notificationRouter.put("/:notificationId/read", notificationController.markAsRead);
notificationRouter.put("/read-all", notificationController.markAllAsRead);
notificationRouter.delete("/:notificationId", notificationController.deleteNotification);
notificationRouter.get("/analytics", notificationController.getNotificationAnalytics);

// Notification preferences
notificationRouter.get("/preferences", notificationController.getNotificationPreferences);
notificationRouter.put("/preferences", notificationController.updateNotificationPreferences);

// Admin routes
notificationRouter.post("/templates", notificationController.createNotificationTemplate);
notificationRouter.get("/templates", notificationController.getNotificationTemplates);
notificationRouter.post("/broadcast", notificationController.broadcastSystemNotification);
notificationRouter.get("/connection-status", notificationController.getConnectionStatus);
notificationRouter.post("/cleanup", notificationController.cleanupExpiredNotifications);
notificationRouter.post("/retry", notificationController.retryFailedNotifications);
