import { Router } from "express";
import analyticsController from "../../controllers/analyticsController/analyticsController.js";

export const analyticsRouter: Router = Router();

// Analytics routes
analyticsRouter.get("/sales", analyticsController.getSalesAnalytics);
analyticsRouter.get("/inventory", analyticsController.getInventoryAnalytics);
analyticsRouter.get("/customers", analyticsController.getCustomerAnalytics);
analyticsRouter.get("/vendors", analyticsController.getVendorAnalytics);
analyticsRouter.get("/overview", analyticsController.getAnalyticsOverview);
analyticsRouter.get("/kpis", analyticsController.getKPIMetrics);

// Report routes
analyticsRouter.post("/reports", analyticsController.createReport);
analyticsRouter.get("/reports", analyticsController.getUserReports);
analyticsRouter.get("/reports/:reportId", analyticsController.getReportById);
analyticsRouter.get("/reports/:reportId/download", analyticsController.downloadReport);

// Dashboard routes
analyticsRouter.post("/dashboards", analyticsController.createDashboard);
analyticsRouter.get("/dashboards", analyticsController.getUserDashboards);
analyticsRouter.get("/dashboards/:dashboardId", analyticsController.getDashboardById);
analyticsRouter.put("/dashboards/:dashboardId", analyticsController.updateDashboard);
analyticsRouter.delete("/dashboards/:dashboardId", analyticsController.deleteDashboard);

// Event tracking
analyticsRouter.post("/events", analyticsController.trackEvent);
