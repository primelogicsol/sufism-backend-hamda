import type { Prisma, ReportType, ReportFormat, DashboardWidgetType } from "@prisma/client";
import { db } from "../configs/database.js";
import logger from "../utils/loggerUtils.js";

export interface ReportParameters {
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  vendorId?: string;
  productId?: number;
  category?: string;
  status?: string;
  format?: ReportFormat;
  groupBy?: "day" | "week" | "month";
  period?: "7d" | "30d" | "90d" | "1y";
  metrics?: string[];
  filters?: Record<string, unknown>;
}

export interface DashboardWidgetConfig {
  type: DashboardWidgetType;
  title: string;
  description?: string;
  position: number;
  size?: string;
  configuration?: Record<string, unknown>;
  refreshInterval?: number;
}

export interface AnalyticsEventData {
  userId?: string;
  eventType: string;
  eventName: string;
  properties?: Record<string, unknown>;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
}

export interface KPIData {
  name: string;
  description?: string;
  category: string;
  formula?: string;
  target?: number;
  unit?: string;
}

export class AnalyticsService {
  /**
   * Generate sales analytics
   */
  static async getSalesAnalytics(params: {
    userId?: string;
    vendorId?: string;
    period?: "7d" | "30d" | "90d" | "1y";
    groupBy?: "day" | "week" | "month";
  }): Promise<unknown> {
    try {
      const { userId, vendorId, period = "30d", groupBy = "day" } = params;

      const dateFrom = new Date();
      switch (period) {
        case "7d":
          dateFrom.setDate(dateFrom.getDate() - 7);
          break;
        case "30d":
          dateFrom.setDate(dateFrom.getDate() - 30);
          break;
        case "90d":
          dateFrom.setDate(dateFrom.getDate() - 90);
          break;
        case "1y":
          dateFrom.setFullYear(dateFrom.getFullYear() - 1);
          break;
      }

      const where: Prisma.OrderWhereInput = {
        createdAt: { gte: dateFrom },
        paymentStatus: "PAID"
      };

      if (userId) {
        where.userId = userId;
      }

      if (vendorId) {
        where.items = {
          some: {
            OR: [
              { category: "MUSIC", music: { userId: vendorId } },
              { category: "DIGITAL_BOOK", digitalBook: { userId: vendorId } },
              { category: "FASHION", fashion: { userId: vendorId } },
              { category: "MEDITATION", meditation: { userId: vendorId } },
              { category: "DECORATION", decoration: { userId: vendorId } },
              { category: "HOME_LIVING", homeAndLiving: { userId: vendorId } },
              { category: "ACCESSORIES", accessories: { userId: vendorId } }
            ]
          }
        };
      }

      const [totalRevenue, totalOrders, averageOrderValue, ordersByStatus, revenueByPeriod, topProducts, customerMetrics] = await Promise.all([
        db.order.aggregate({
          where,
          _sum: { amount: true }
        }),
        db.order.count({ where }),
        db.order.aggregate({
          where,
          _avg: { amount: true }
        }),
        db.order.groupBy({
          by: ["status"],
          where,
          _count: { status: true },
          _sum: { amount: true }
        }),
        this.getRevenueByPeriod(where, groupBy),
        this.getTopProducts(where),
        this.getCustomerMetrics(where)
      ]);

      return {
        summary: {
          totalRevenue: totalRevenue._sum.amount || 0,
          totalOrders,
          averageOrderValue: averageOrderValue._avg.amount || 0,
          period,
          dateFrom,
          dateTo: new Date()
        },
        ordersByStatus: ordersByStatus.map((item) => ({
          status: item.status,
          count: item._count.status,
          revenue: item._sum.amount || 0
        })),
        revenueByPeriod,
        topProducts,
        customerMetrics
      };
    } catch (error) {
      logger.error(`Error getting sales analytics: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Generate inventory analytics
   */
  static async getInventoryAnalytics(params: { userId?: string; vendorId?: string; period?: "7d" | "30d" | "90d" | "1y" }): Promise<unknown> {
    try {
      // eslint-disable-next-line no-unused-vars
      const { userId, vendorId: _vendorId, period = "30d" } = params;

      const dateFrom = new Date();
      switch (period) {
        case "7d":
          dateFrom.setDate(dateFrom.getDate() - 7);
          break;
        case "30d":
          dateFrom.setDate(dateFrom.getDate() - 30);
          break;
        case "90d":
          dateFrom.setDate(dateFrom.getDate() - 90);
          break;
        case "1y":
          dateFrom.setFullYear(dateFrom.getFullYear() - 1);
          break;
      }

      const where: Prisma.InventoryLogWhereInput = {
        createdAt: { gte: dateFrom }
      };

      if (userId) {
        where.userId = userId;
      }

      const [totalStockMovements, stockMovementsByType, lowStockAlerts, topMovingProducts, inventoryValue] = await Promise.all([
        db.inventoryLog.count({ where }),
        db.inventoryLog.groupBy({
          by: ["changeType"],
          where,
          _count: { changeType: true },
          _sum: { quantityChange: true }
        }),
        db.lowStockAlert.count({
          where: {
            createdAt: { gte: dateFrom },
            isResolved: false
          }
        }),
        this.getTopMovingProducts(where),
        this.calculateInventoryValue()
      ]);

      return {
        summary: {
          totalStockMovements,
          lowStockAlerts,
          inventoryValue,
          period,
          dateFrom,
          dateTo: new Date()
        },
        stockMovementsByType: stockMovementsByType.map((item) => ({
          changeType: item.changeType,
          count: item._count.changeType,
          totalQuantity: item._sum.quantityChange || 0
        })),
        topMovingProducts
      };
    } catch (error) {
      logger.error(`Error getting inventory analytics: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Generate customer analytics
   */
  static async getCustomerAnalytics(params: { period?: "7d" | "30d" | "90d" | "1y" }): Promise<unknown> {
    try {
      const { period = "30d" } = params;

      const dateFrom = new Date();
      switch (period) {
        case "7d":
          dateFrom.setDate(dateFrom.getDate() - 7);
          break;
        case "30d":
          dateFrom.setDate(dateFrom.getDate() - 30);
          break;
        case "90d":
          dateFrom.setDate(dateFrom.getDate() - 90);
          break;
        case "1y":
          dateFrom.setFullYear(dateFrom.getFullYear() - 1);
          break;
      }

      const [totalCustomers, newCustomers, activeCustomers, customerLifetimeValue, customerSegments, topCustomers] = await Promise.all([
        db.user.count({
          where: { role: "customer" }
        }),
        db.user.count({
          where: {
            role: "customer",
            createdAt: { gte: dateFrom }
          }
        }),
        db.user.count({
          where: {
            role: "customer",
            createdAt: { gte: dateFrom }
          }
        }),
        this.calculateCustomerLifetimeValue(),
        this.getCustomerSegments(),
        this.getTopCustomers(dateFrom)
      ]);

      return {
        summary: {
          totalCustomers,
          newCustomers,
          activeCustomers,
          customerLifetimeValue,
          period,
          dateFrom,
          dateTo: new Date()
        },
        customerSegments,
        topCustomers
      };
    } catch (error) {
      logger.error(`Error getting customer analytics: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Generate vendor analytics
   */
  static async getVendorAnalytics(params: { vendorId?: string; period?: "7d" | "30d" | "90d" | "1y" }): Promise<unknown> {
    try {
      const { vendorId, period = "30d" } = params;

      const dateFrom = new Date();
      switch (period) {
        case "7d":
          dateFrom.setDate(dateFrom.getDate() - 7);
          break;
        case "30d":
          dateFrom.setDate(dateFrom.getDate() - 30);
          break;
        case "90d":
          dateFrom.setDate(dateFrom.getDate() - 90);
          break;
        case "1y":
          dateFrom.setFullYear(dateFrom.getFullYear() - 1);
          break;
      }

      const where: Prisma.OrderWhereInput = {
        createdAt: { gte: dateFrom },
        items: {
          some: {
            OR: [
              { category: "MUSIC", music: { userId: vendorId } },
              { category: "DIGITAL_BOOK", digitalBook: { userId: vendorId } },
              { category: "FASHION", fashion: { userId: vendorId } },
              { category: "MEDITATION", meditation: { userId: vendorId } },
              { category: "DECORATION", decoration: { userId: vendorId } },
              { category: "HOME_LIVING", homeAndLiving: { userId: vendorId } },
              { category: "ACCESSORIES", accessories: { userId: vendorId } }
            ]
          }
        }
      };

      const [totalRevenue, totalOrders, averageOrderValue, topProducts, performanceMetrics] = await Promise.all([
        db.order.aggregate({
          where,
          _sum: { amount: true }
        }),
        db.order.count({ where }),
        db.order.aggregate({
          where,
          _avg: { amount: true }
        }),
        this.getTopProducts(where),
        this.getVendorPerformanceMetrics(vendorId, dateFrom)
      ]);

      return {
        summary: {
          totalRevenue: totalRevenue._sum.amount || 0,
          totalOrders,
          averageOrderValue: averageOrderValue._avg.amount || 0,
          period,
          dateFrom,
          dateTo: new Date()
        },
        topProducts,
        performanceMetrics
      };
    } catch (error) {
      logger.error(`Error getting vendor analytics: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Create custom report
   */
  static async createReport(
    userId: string,
    name: string,
    type: ReportType,
    format: ReportFormat,
    parameters: ReportParameters
  ): Promise<{ success: boolean; report: unknown; message: string }> {
    try {
      const report = await db.report.create({
        data: {
          userId,
          name,
          type,
          format,
          parameters: JSON.stringify(parameters),
          status: "PENDING",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      // Generate report data asynchronously
      this.generateReportData(report.id, type, parameters).catch((error) => {
        logger.error(`Error generating report data: ${error}`);
      });

      logger.info(`Report created: ${name} for user ${userId}`);

      return {
        success: true,
        report,
        message: "Report created successfully"
      };
    } catch (error) {
      logger.error(`Error creating report: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Generate report data
   */
  private static async generateReportData(reportId: number, type: ReportType, parameters: ReportParameters): Promise<void> {
    try {
      await db.report.update({
        where: { id: reportId },
        data: { status: "GENERATING" }
      });

      let reportData: Record<string, unknown> = {};

      switch (type) {
        case "SALES_REPORT":
          reportData = (await this.getSalesAnalytics(parameters)) as Record<string, unknown>;
          break;
        case "INVENTORY_REPORT":
          reportData = (await this.getInventoryAnalytics(parameters)) as Record<string, unknown>;
          break;
        case "CUSTOMER_REPORT":
          reportData = (await this.getCustomerAnalytics(parameters)) as Record<string, unknown>;
          break;
        case "VENDOR_REPORT":
          reportData = (await this.getVendorAnalytics(parameters)) as Record<string, unknown>;
          break;
        case "ORDER_REPORT":
          reportData = (await this.getOrderAnalytics(parameters)) as Record<string, unknown>;
          break;
        case "RETURN_REPORT":
          reportData = (await this.getReturnAnalytics(parameters)) as Record<string, unknown>;
          break;
        case "PAYMENT_REPORT":
          reportData = (await this.getPaymentAnalytics(parameters)) as Record<string, unknown>;
          break;
        case "PERFORMANCE_REPORT":
          reportData = (await this.getPerformanceAnalytics(parameters)) as Record<string, unknown>;
          break;
        default:
          throw new Error(`Unknown report type: ${type}`);
      }

      await db.report.update({
        where: { id: reportId },
        data: {
          status: "COMPLETED",
          data: JSON.stringify(reportData),
          generatedAt: new Date(),
          generatedBy: "system"
        }
      });

      logger.info(`Report data generated for report ${reportId}`);
    } catch (error) {
      await db.report.update({
        where: { id: reportId },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        }
      });
      throw error;
    }
  }

  /**
   * Create dashboard
   */
  static async createDashboard(
    userId: string,
    name: string,
    description?: string,
    widgets?: DashboardWidgetConfig[]
  ): Promise<{ success: boolean; dashboard: unknown; message: string }> {
    try {
      const dashboard = await db.dashboard.create({
        data: {
          userId,
          name,
          description,
          layout: JSON.stringify({ columns: 3, rows: 4 }),
          settings: JSON.stringify({ theme: "light", refreshInterval: 300 })
        }
      });

      if (widgets && widgets.length > 0) {
        await db.dashboardWidget.createMany({
          data: widgets.map((widget) => ({
            dashboardId: dashboard.id,
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

      logger.info(`Dashboard created: ${name} for user ${userId}`);

      return {
        success: true,
        dashboard,
        message: "Dashboard created successfully"
      };
    } catch (error) {
      logger.error(`Error creating dashboard: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Track analytics event
   */
  static async trackEvent(eventData: AnalyticsEventData): Promise<void> {
    try {
      await db.analyticsEvent.create({
        data: {
          userId: eventData.userId,
          eventType: eventData.eventType,
          eventName: eventData.eventName,
          properties: eventData.properties ? JSON.stringify(eventData.properties) : null,
          sessionId: eventData.sessionId,
          ipAddress: eventData.ipAddress,
          userAgent: eventData.userAgent,
          referrer: eventData.referrer
        }
      });
    } catch (error) {
      logger.error(`Error tracking analytics event: ${String(error)}`);
    }
  }

  /**
   * Get KPI metrics
   */
  static async getKPIMetrics(): Promise<Record<string, unknown>> {
    try {
      const kpis = await db.kPI.findMany({
        where: { isActive: true },
        orderBy: { category: "asc" }
      });

      // Calculate current values for each KPI
      const kpiMetrics = await Promise.all(
        kpis.map(async (kpi) => {
          let currentValue = 0;

          switch (kpi.name) {
            case "total_revenue": {
              const revenueResult = await db.order.aggregate({
                where: { paymentStatus: "PAID" },
                _sum: { amount: true }
              });
              currentValue = revenueResult._sum.amount || 0;
              break;
            }

            case "total_orders":
              currentValue = await db.order.count({
                where: { paymentStatus: "PAID" }
              });
              break;

            case "average_order_value": {
              const avgResult = await db.order.aggregate({
                where: { paymentStatus: "PAID" },
                _avg: { amount: true }
              });
              currentValue = avgResult._avg.amount || 0;
              break;
            }

            case "total_customers":
              currentValue = await db.user.count({
                where: { role: "customer" }
              });
              break;

            case "inventory_turnover": {
              // Calculate inventory turnover ratio
              const inventoryLogs = await db.inventoryLog.count({
                where: { changeType: "SALE" }
              });
              currentValue = inventoryLogs;
              break;
            }
          }

          return {
            ...kpi,
            currentValue,
            targetAchieved: kpi.target ? (currentValue / kpi.target) * 100 : null
          };
        })
      );

      return kpiMetrics as unknown as Record<string, unknown>;
    } catch (error) {
      logger.error(`Error getting KPI metrics: ${String(error)}`);
      throw error;
    }
  }

  // Helper methods

  // eslint-disable-next-line no-unused-vars
  private static getRevenueByPeriod(_where: Prisma.OrderWhereInput, _groupBy: string): unknown[] {
    // Implementation for revenue grouping by period
    return [];
  }

  // eslint-disable-next-line no-unused-vars
  private static getTopProducts(_where: Prisma.OrderWhereInput): unknown[] {
    // Implementation for top products
    return [];
  }

  // eslint-disable-next-line no-unused-vars
  private static getCustomerMetrics(_where: Prisma.OrderWhereInput): unknown {
    // Implementation for customer metrics
    return {};
  }

  // eslint-disable-next-line no-unused-vars
  private static getTopMovingProducts(_where: Prisma.InventoryLogWhereInput): unknown[] {
    // Implementation for top moving products
    return [];
  }

  private static calculateInventoryValue(): number {
    // Implementation for inventory value calculation
    return 0;
  }

  private static calculateCustomerLifetimeValue(): number {
    // Implementation for customer lifetime value
    return 0;
  }

  private static getCustomerSegments(): unknown[] {
    // Implementation for customer segments
    return [];
  }

  // eslint-disable-next-line no-unused-vars
  private static getTopCustomers(_dateFrom: Date): unknown[] {
    // Implementation for top customers
    return [];
  }

  // eslint-disable-next-line no-unused-vars
  private static getVendorPerformanceMetrics(_vendorId?: string, _dateFrom?: Date): unknown {
    // Implementation for vendor performance metrics
    return {};
  }

  // eslint-disable-next-line no-unused-vars
  private static getOrderAnalytics(_parameters: ReportParameters): unknown {
    // Implementation for order analytics
    return {};
  }

  // eslint-disable-next-line no-unused-vars
  private static getReturnAnalytics(_parameters: ReportParameters): unknown {
    // Implementation for return analytics
    return {};
  }

  // eslint-disable-next-line no-unused-vars
  private static getPaymentAnalytics(_parameters: ReportParameters): unknown {
    // Implementation for payment analytics
    return {};
  }

  // eslint-disable-next-line no-unused-vars
  private static getPerformanceAnalytics(_parameters: ReportParameters): unknown {
    // Implementation for performance analytics
    return {};
  }
}
