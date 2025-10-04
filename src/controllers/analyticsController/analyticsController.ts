import { ReportType, ReportFormat, ReportStatus, DashboardWidgetType } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { AnalyticsService } from "../../services/analytics.service.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  /**
   * Get sales analytics
   */
  getSalesAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { vendorId, period = "30d", groupBy = "day" } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const analytics = await AnalyticsService.getSalesAnalytics({
        userId,
        vendorId: vendorId as string,
        period: period as "7d" | "30d" | "90d" | "1y",
        groupBy: groupBy as "day" | "week" | "month"
      });
      
      return httpResponse(req, res, reshttp.okCode, "Sales analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting sales analytics: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get sales analytics");
    }
  }),

  /**
   * Get inventory analytics
   */
  getInventoryAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { vendorId, period = "30d" } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const analytics = await AnalyticsService.getInventoryAnalytics({
        userId,
        vendorId: vendorId as string,
        period: period as "7d" | "30d" | "90d" | "1y"
      });
      
      return httpResponse(req, res, reshttp.okCode, "Inventory analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting inventory analytics: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get inventory analytics");
    }
  }),

  /**
   * Get customer analytics
   */
  getCustomerAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { period = "30d" } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const analytics = await AnalyticsService.getCustomerAnalytics({
        period: period as "7d" | "30d" | "90d" | "1y"
      });
      
      return httpResponse(req, res, reshttp.okCode, "Customer analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting customer analytics: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get customer analytics");
    }
  }),

  /**
   * Get vendor analytics
   */
  getVendorAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { vendorId, period = "30d" } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const analytics = await AnalyticsService.getVendorAnalytics({
        vendorId: vendorId as string,
        period: period as "7d" | "30d" | "90d" | "1y"
      });
      
      return httpResponse(req, res, reshttp.okCode, "Vendor analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting vendor analytics: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor analytics");
    }
  }),

  /**
   * Create custom report
   */
  createReport: asyncHandler(async (req: _Request, res) => {
    const { name, type, format, parameters } = req.body;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!name || !type || !format) {
      return httpResponse(req, res, reshttp.badRequestCode, "Name, type, and format are required");
    }

    try {
      const result = await AnalyticsService.createReport(
        userId,
        name,
        type as ReportType,
        format as ReportFormat,
        parameters
      );
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.report);
    } catch (error) {
      logger.error(`Error creating report: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create report");
    }
  }),

  /**
   * Get user reports
   */
  getUserReports: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { status, type, page = "1", limit = "10" } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const where: any = { userId };
      if (status) where.status = status;
      if (type) where.type = type;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [reports, total] = await Promise.all([
        db.report.findMany({
          where,
          skip,
          take: parseInt(limit as string),
          orderBy: { createdAt: "desc" }
        }),
        db.report.count({ where })
      ]);

      return httpResponse(req, res, reshttp.okCode, "Reports retrieved successfully", {
        reports,
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      });
    } catch (error) {
      logger.error(`Error getting user reports: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get reports");
    }
  }),

  /**
   * Get report by ID
   */
  getReportById: asyncHandler(async (req: _Request, res) => {
    const { reportId } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const report = await db.report.findFirst({
        where: { id: parseInt(reportId), userId }
      });

      if (!report) {
        return httpResponse(req, res, reshttp.notFoundCode, "Report not found");
      }

      return httpResponse(req, res, reshttp.okCode, "Report retrieved successfully", report);
    } catch (error) {
      logger.error(`Error getting report: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get report");
    }
  }),

  /**
   * Download report
   */
  downloadReport: asyncHandler(async (req: _Request, res) => {
    const { reportId } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const report = await db.report.findFirst({
        where: { id: parseInt(reportId), userId }
      });

      if (!report) {
        return httpResponse(req, res, reshttp.notFoundCode, "Report not found");
      }

      if (report.status !== "COMPLETED") {
        return httpResponse(req, res, reshttp.badRequestCode, "Report is not ready for download");
      }

      // Update download count
      await db.report.update({
        where: { id: parseInt(reportId) },
        data: {
          downloadCount: { increment: 1 },
          lastDownloadedAt: new Date()
        }
      });

      return httpResponse(req, res, reshttp.okCode, "Report download initiated", {
        fileUrl: report.fileUrl,
        fileName: `${report.name}.${report.format.toLowerCase()}`
      });
    } catch (error) {
      logger.error(`Error downloading report: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to download report");
    }
  }),

  /**
   * Create dashboard
   */
  createDashboard: asyncHandler(async (req: _Request, res) => {
    const { name, description, widgets } = req.body;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!name) {
      return httpResponse(req, res, reshttp.badRequestCode, "Dashboard name is required");
    }

    try {
      const result = await AnalyticsService.createDashboard(
        userId,
        name,
        description,
        widgets
      );
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.dashboard);
    } catch (error) {
      logger.error(`Error creating dashboard: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create dashboard");
    }
  }),

  /**
   * Get user dashboards
   */
  getUserDashboards: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const dashboards = await db.dashboard.findMany({
        where: { userId },
        include: {
          widgets: {
            orderBy: { position: "asc" }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      return httpResponse(req, res, reshttp.okCode, "Dashboards retrieved successfully", dashboards);
    } catch (error) {
      logger.error(`Error getting dashboards: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get dashboards");
    }
  }),

  /**
   * Get dashboard by ID
   */
  getDashboardById: asyncHandler(async (req: _Request, res) => {
    const { dashboardId } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const dashboard = await db.dashboard.findFirst({
        where: { id: parseInt(dashboardId), userId },
        include: {
          widgets: {
            orderBy: { position: "asc" }
          }
        }
      });

      if (!dashboard) {
        return httpResponse(req, res, reshttp.notFoundCode, "Dashboard not found");
      }

      return httpResponse(req, res, reshttp.okCode, "Dashboard retrieved successfully", dashboard);
    } catch (error) {
      logger.error(`Error getting dashboard: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get dashboard");
    }
  }),

  /**
   * Update dashboard
   */
  updateDashboard: asyncHandler(async (req: _Request, res) => {
    const { dashboardId } = req.params;
    const { name, description, layout, settings, widgets } = req.body;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const dashboard = await db.dashboard.findFirst({
        where: { id: parseInt(dashboardId), userId }
      });

      if (!dashboard) {
        return httpResponse(req, res, reshttp.notFoundCode, "Dashboard not found");
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (layout) updateData.layout = JSON.stringify(layout);
      if (settings) updateData.settings = JSON.stringify(settings);

      const updatedDashboard = await db.dashboard.update({
        where: { id: parseInt(dashboardId) },
        data: updateData
      });

      // Update widgets if provided
      if (widgets && Array.isArray(widgets)) {
        // Delete existing widgets
        await db.dashboardWidget.deleteMany({
          where: { dashboardId: parseInt(dashboardId) }
        });

        // Create new widgets
        await db.dashboardWidget.createMany({
          data: widgets.map((widget: any) => ({
            dashboardId: parseInt(dashboardId),
            type: widget.type,
            title: widget.title,
            description: widget.description,
            position: widget.position,
            size: widget.size || "medium",
            configuration: widget.configuration ? JSON.stringify(widget.configuration) : null,
            refreshInterval: widget.refreshInterval || 300
          }))
        });
      }

      return httpResponse(req, res, reshttp.okCode, "Dashboard updated successfully", updatedDashboard);
    } catch (error) {
      logger.error(`Error updating dashboard: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update dashboard");
    }
  }),

  /**
   * Delete dashboard
   */
  deleteDashboard: asyncHandler(async (req: _Request, res) => {
    const { dashboardId } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const dashboard = await db.dashboard.findFirst({
        where: { id: parseInt(dashboardId), userId }
      });

      if (!dashboard) {
        return httpResponse(req, res, reshttp.notFoundCode, "Dashboard not found");
      }

      // Delete widgets first
      await db.dashboardWidget.deleteMany({
        where: { dashboardId: parseInt(dashboardId) }
      });

      // Delete dashboard
      await db.dashboard.delete({
        where: { id: parseInt(dashboardId) }
      });

      logger.info(`Dashboard ${dashboardId} deleted by user ${userId}`);
      
      return httpResponse(req, res, reshttp.okCode, "Dashboard deleted successfully");
    } catch (error) {
      logger.error(`Error deleting dashboard: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to delete dashboard");
    }
  }),

  /**
   * Track analytics event
   */
  trackEvent: asyncHandler(async (req: _Request, res) => {
    const { eventType, eventName, properties, sessionId } = req.body;
    const userId = req.userFromToken?.id;

    if (!eventType || !eventName) {
      return httpResponse(req, res, reshttp.badRequestCode, "Event type and name are required");
    }

    try {
      await AnalyticsService.trackEvent({
        userId,
        eventType,
        eventName,
        properties,
        sessionId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        referrer: req.get("Referer")
      });

      return httpResponse(req, res, reshttp.okCode, "Event tracked successfully");
    } catch (error) {
      logger.error(`Error tracking event: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to track event");
    }
  }),

  /**
   * Get KPI metrics
   */
  getKPIMetrics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const kpis = await AnalyticsService.getKPIMetrics();
      
      return httpResponse(req, res, reshttp.okCode, "KPI metrics retrieved successfully", kpis);
    } catch (error) {
      logger.error(`Error getting KPI metrics: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get KPI metrics");
    }
  }),

  /**
   * Get analytics overview
   */
  getAnalyticsOverview: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { period = "30d" } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const [salesAnalytics, inventoryAnalytics, customerAnalytics, kpis] = await Promise.all([
        AnalyticsService.getSalesAnalytics({ userId, period: period as "7d" | "30d" | "90d" | "1y" }),
        AnalyticsService.getInventoryAnalytics({ userId, period: period as "7d" | "30d" | "90d" | "1y" }),
        AnalyticsService.getCustomerAnalytics({ period: period as "7d" | "30d" | "90d" | "1y" }),
        AnalyticsService.getKPIMetrics()
      ]);

      const overview = {
        sales: salesAnalytics.summary,
        inventory: inventoryAnalytics.summary,
        customers: customerAnalytics.summary,
        kpis
      };

      return httpResponse(req, res, reshttp.okCode, "Analytics overview retrieved successfully", overview);
    } catch (error) {
      logger.error(`Error getting analytics overview: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get analytics overview");
    }
  })
};
