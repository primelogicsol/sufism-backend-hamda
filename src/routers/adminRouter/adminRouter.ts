import { Router } from "express";
import adminAnalyticsController from "../../controllers/adminController/adminAnalyticsController.js";
import adminNotificationController from "../../controllers/adminController/adminNotificationController.js";
import adminUserController from "../../controllers/adminController/adminUserController.js";
import adminVendorController from "../../controllers/adminController/adminVendorController.js";
import { adminAuth } from "../../middleware/adminAuthMiddleware.js";

export const adminRouter: Router = Router();

// Admin System Health Routes
adminRouter.get("/health/database", adminAuth, adminAnalyticsController.getDatabaseHealth);

// Admin Analytics Routes
adminRouter.get("/analytics/overview", adminAuth, adminAnalyticsController.getSystemOverview);
adminRouter.get("/analytics/sales", adminAuth, adminAnalyticsController.getSalesAnalytics);
adminRouter.get("/analytics/users", adminAuth, adminAnalyticsController.getUserAnalytics);
adminRouter.get("/analytics/products", adminAuth, adminAnalyticsController.getProductAnalytics);
adminRouter.get("/analytics/orders", adminAuth, adminAnalyticsController.getOrderAnalytics);

// Admin User Management Routes
adminRouter.get("/users", adminAuth, adminUserController.getAllUsers);
adminRouter.get("/users/stats", adminAuth, adminUserController.getUserStats);
adminRouter.get("/users/:id", adminAuth, adminUserController.getUserById);
adminRouter.put("/users/:id/role", adminAuth, adminUserController.updateUserRole);
adminRouter.put("/users/:id/verification", adminAuth, adminUserController.updateUserVerification);
adminRouter.delete("/users/:id", adminAuth, adminUserController.deleteUser);

// Admin Vendor Management Routes
adminRouter.get("/vendors", adminAuth, adminVendorController.getAllVendors);
adminRouter.get("/vendors/stats", adminAuth, adminVendorController.getVendorStats);
adminRouter.get("/vendors/:id", adminAuth, adminVendorController.getVendorDetails);
adminRouter.put("/vendors/:id/approve", adminAuth, adminVendorController.approveVendor);
adminRouter.put("/vendors/:id/reject", adminAuth, adminVendorController.rejectVendor);
adminRouter.post("/vendors/bulk-approve", adminAuth, adminVendorController.bulkApproveVendors);

// Admin Notification Management Routes
adminRouter.post("/notifications/templates", adminAuth, adminNotificationController.createNotificationTemplate);
adminRouter.get("/notifications/templates", adminAuth, adminNotificationController.getNotificationTemplates);
adminRouter.post("/notifications/broadcast", adminAuth, adminNotificationController.broadcastSystemNotification);
adminRouter.get("/notifications/connection-status", adminAuth, adminNotificationController.getConnectionStatus);
adminRouter.post("/notifications/cleanup", adminAuth, adminNotificationController.cleanupExpiredNotifications);
adminRouter.post("/notifications/retry", adminAuth, adminNotificationController.retryFailedNotifications);
