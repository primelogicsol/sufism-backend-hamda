import { Prisma, ReportType, ReportFormat, ReportStatus, DashboardWidgetType } from "@prisma/client";
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
  groupBy?: string;
  metrics?: string[];
  filters?: Record<string, any>;
}

export interface DashboardWidgetConfig {
  type: DashboardWidgetType;
  title: string;
  description?: string;
  position: number;
  size?: string;
  configuration?: Record<string, any>;
  refreshInterval?: number;
}

export interface AnalyticsEventData {
  userId?: string;
  eventType: string;
  eventName: string;
  properties?: Record<string, any>;
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
  }): Promise<any> {
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

      const [
        totalRevenue,
        totalOrders,
        averageOrderValue,
        ordersByStatus,
        revenueByPeriod,
        topProducts,
        customerMetrics
      ] = await Promise.all([
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
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count.status,
          revenue: item._sum.amount || 0
        })),
        revenueByPeriod,
        topProducts,
        customerMetrics
      };
    } catch (error) {
      logger.error(`Error getting sales analytics: ${error}`);
      throw error;
    }
  }

  /**
   * Generate inventory analytics
   */
  static async getInventoryAnalytics(params: {
    userId?: string;
    vendorId?: string;
    period?: "7d" | "30d" | "90d" | "1y";
  }): Promise<any> {
    try {
      const { userId, vendorId, period = "30d" } = params;

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

      const [
        totalStockMovements,
        stockMovementsByType,
        lowStockAlerts,
        topMovingProducts,
        inventoryValue
      ] = await Promise.all([
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
        stockMovementsByType: stockMovementsByType.map(item => ({
          changeType: item.changeType,
          count: item._count.changeType,
          totalQuantity: item._sum.quantityChange || 0
        })),
        topMovingProducts
      };
    } catch (error) {
      logger.error(`Error getting inventory analytics: ${error}`);
      throw error;
    }
  }

  /**
   * Generate customer analytics
   */
  static async getCustomerAnalytics(params: {
    period?: "7d" | "30d" | "90d" | "1y";
  }): Promise<any> {
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

      const [
        totalCustomers,
        newCustomers,
        activeCustomers,
        customerLifetimeValue,
        customerSegments,
        topCustomers
      ] = await Promise.all([
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
            orders: {
              some: {
                createdAt: { gte: dateFrom }
              }
            }
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
      logger.error(`Error getting customer analytics: ${error}`);
      throw error;
    }
  }

  /**
   * Generate vendor analytics
   */
  static async getVendorAnalytics(params: {
    vendorId?: string;
    period?: "7d" | "30d" | "90d" | "1y";
  }): Promise<any> {
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

      const [
        totalRevenue,
        totalOrders,
        averageOrderValue,
        topProducts,
        performanceMetrics
      ] = await Promise.all([
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
      logger.error(`Error getting vendor analytics: ${error}`);
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
  ): Promise<{ success: boolean; report: any; message: string }> {
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
      this.generateReportData(report.id, type, parameters).catch(error => {
        logger.error(`Error generating report data: ${error}`);
      });

      logger.info(`Report created: ${name} for user ${userId}`);
      
      return {
        success: true,
        report,
        message: "Report created successfully"
      };
    } catch (error) {
      logger.error(`Error creating report: ${error}`);
      throw error;
    }
  }

  /**
   * Generate report data
   */
  private static async generateReportData(
    reportId: number,
    type: ReportType,
    parameters: ReportParameters
  ): Promise<void> {
    try {
      await db.report.update({
        where: { id: reportId },
        data: { status: "GENERATING" }
      });

      let reportData: any = {};

      switch (type) {
        case "SALES_REPORT":
          reportData = await this.getSalesAnalytics(parameters);
          break;
        case "INVENTORY_REPORT":
          reportData = await this.getInventoryAnalytics(parameters);
          break;
        case "CUSTOMER_REPORT":
          reportData = await this.getCustomerAnalytics(parameters);
          break;
        case "VENDOR_REPORT":
          reportData = await this.getVendorAnalytics(parameters);
          break;
        case "ORDER_REPORT":
          reportData = await this.getOrderAnalytics(parameters);
          break;
        case "RETURN_REPORT":
          reportData = await this.getReturnAnalytics(parameters);
          break;
        case "PAYMENT_REPORT":
          reportData = await this.getPaymentAnalytics(parameters);
          break;
        case "PERFORMANCE_REPORT":
          reportData = await this.getPerformanceAnalytics(parameters);
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
  ): Promise<{ success: boolean; dashboard: any; message: string }> {
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
          data: widgets.map(widget => ({
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
      logger.error(`Error creating dashboard: ${error}`);
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
      logger.error(`Error tracking analytics event: ${error}`);
    }
  }

  /**
   * Get KPI metrics
   */
  static async getKPIMetrics(): Promise<any> {
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
            case "total_revenue":
              const revenueResult = await db.order.aggregate({
                where: { paymentStatus: "PAID" },
                _sum: { amount: true }
              });
              currentValue = revenueResult._sum.amount || 0;
              break;
              
            case "total_orders":
              currentValue = await db.order.count({
                where: { paymentStatus: "PAID" }
              });
              break;
              
            case "average_order_value":
              const avgResult = await db.order.aggregate({
                where: { paymentStatus: "PAID" },
                _avg: { amount: true }
              });
              currentValue = avgResult._avg.amount || 0;
              break;
              
            case "total_customers":
              currentValue = await db.user.count({
                where: { role: "customer" }
              });
              break;
              
            case "inventory_turnover":
              // Calculate inventory turnover ratio
              const inventoryLogs = await db.inventoryLog.count({
                where: { changeType: "SALE" }
              });
              currentValue = inventoryLogs;
              break;
          }

          return {
            ...kpi,
            currentValue,
            targetAchieved: kpi.target ? (currentValue / kpi.target) * 100 : null
          };
        })
      );

      return kpiMetrics;
    } catch (error) {
      logger.error(`Error getting KPI metrics: ${error}`);
      throw error;
    }
  }

  // Helper methods
  private static async getRevenueByPeriod(where: Prisma.OrderWhereInput, groupBy: string): Promise<any[]> {
    // Implementation for revenue grouping by period
    return [];
  }

  private static async getTopProducts(where: Prisma.OrderWhereInput): Promise<any[]> {
    // Implementation for top products
    return [];
  }

  private static async getCustomerMetrics(where: Prisma.OrderWhereInput): Promise<any> {
    // Implementation for customer metrics
    return {};
  }

  private static async getTopMovingProducts(where: Prisma.InventoryLogWhereInput): Promise<any[]> {
    // Implementation for top moving products
    return [];
  }

  private static async calculateInventoryValue(): Promise<number> {
    // Implementation for inventory value calculation
    return 0;
  }

  private static async calculateCustomerLifetimeValue(): Promise<number> {
    // Implementation for customer lifetime value
    return 0;
  }

  private static async getCustomerSegments(): Promise<any[]> {
    // Implementation for customer segments
    return [];
  }

  private static async getTopCustomers(dateFrom: Date): Promise<any[]> {
    // Implementation for top customers
    return [];
  }

  private static async getVendorPerformanceMetrics(vendorId?: string, dateFrom?: Date): Promise<any> {
    // Implementation for vendor performance metrics
    return {};
  }

  private static async getOrderAnalytics(parameters: ReportParameters): Promise<any> {
    // Implementation for order analytics
    return {};
  }

  private static async getReturnAnalytics(parameters: ReportParameters): Promise<any> {
    // Implementation for return analytics
    return {};
  }

  private static async getPaymentAnalytics(parameters: ReportParameters): Promise<any> {
    // Implementation for payment analytics
    return {};
  }

  private static async getPerformanceAnalytics(parameters: ReportParameters): Promise<any> {
    // Implementation for performance analytics
    return {};
  }
}
