import type { Request, Response } from "express";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  /**
   * Database health check (Admin JWT Auth)
   */
  getDatabaseHealth: asyncHandler(async (req: Request, res: Response) => {
    try {
      // Test database connection
      await db.$queryRaw`SELECT 1`;

      // Get basic database info
      const [userCount, orderCount] = await Promise.all([db.user.count(), db.order.count()]);

      return httpResponse(req, res, reshttp.okCode, "Database is healthy", {
        status: "healthy",
        connected: true,
        timestamp: new Date().toISOString(),
        basicStats: {
          totalUsers: userCount,
          totalOrders: orderCount
        }
      });
    } catch (error) {
      logger.error(`Database health check failed: ${String(error)}`);

      return httpResponse(req, res, 503, "Database is not accessible", {
        status: "unhealthy",
        connected: false,
        timestamp: new Date().toISOString(),
        error: String(error).includes("Can't reach database server") ? "Database server is not reachable" : "Database connection error"
      });
    }
  }),

  /**
   * Get system overview analytics (Admin JWT Auth)
   */
  getSystemOverview: asyncHandler(async (req: Request, res: Response) => {
    try {
      const [
        totalUsers,
        totalVendors,
        totalOrders,
        accessoriesCount,
        fashionCount,
        meditationCount,
        decorationCount,
        homeLivingCount,
        digitalBookCount,
        musicCount,
        totalRevenue,
        recentUsers,
        recentOrders
      ] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { role: "vendor" } }),
        db.order.count(),
        db.accessories.count(),
        db.fashion.count(),
        db.meditation.count(),
        db.decoration.count(),
        db.homeAndLiving.count(),
        db.digitalBook.count(),
        db.music.count(),
        db.order.aggregate({
          where: { paymentStatus: "PAID" },
          _sum: { amount: true }
        }),
        db.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        }),
        db.order.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        })
      ]);

      const totalProducts = accessoriesCount + fashionCount + meditationCount + decorationCount + homeLivingCount + digitalBookCount + musicCount;

      return httpResponse(req, res, reshttp.okCode, "System overview retrieved successfully", {
        users: {
          total: totalUsers,
          recent: recentUsers
        },
        vendors: {
          total: totalVendors
        },
        orders: {
          total: totalOrders,
          recent: recentOrders
        },
        products: {
          total: totalProducts
        },
        revenue: {
          total: totalRevenue._sum.amount || 0
        }
      });
    } catch (error) {
      logger.error(`Error getting system overview: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get system overview");
    }
  }),

  /**
   * Get sales analytics (Admin JWT Auth)
   */
  getSalesAnalytics: asyncHandler(async (req: Request, res: Response) => {
    const { period = "30d" } = req.query as { period?: string };

    try {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [totalSales, totalOrders, averageOrderValue, salesByDay] = await Promise.all([
        db.order.aggregate({
          where: {
            paymentStatus: "PAID",
            createdAt: { gte: startDate }
          },
          _sum: { amount: true },
          _count: true
        }),
        db.order.count({
          where: {
            paymentStatus: "PAID",
            createdAt: { gte: startDate }
          }
        }),
        db.order.aggregate({
          where: {
            paymentStatus: "PAID",
            createdAt: { gte: startDate }
          },
          _avg: { amount: true }
        }),
        db.order.groupBy({
          by: ["createdAt"],
          where: {
            paymentStatus: "PAID",
            createdAt: { gte: startDate }
          },
          _sum: { amount: true },
          _count: true,
          orderBy: { createdAt: "asc" }
        })
      ]);

      return httpResponse(req, res, reshttp.okCode, "Sales analytics retrieved successfully", {
        period,
        totalSales: totalSales._sum.amount || 0,
        totalOrders,
        averageOrderValue: averageOrderValue._avg.amount || 0,
        salesByDay: salesByDay.map((day) => ({
          date: day.createdAt,
          sales: day._sum.amount || 0,
          orders: day._count
        }))
      });
    } catch (error) {
      logger.error(`Error getting sales analytics: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get sales analytics");
    }
  }),

  /**
   * Get user analytics (Admin JWT Auth)
   */
  getUserAnalytics: asyncHandler(async (req: Request, res: Response) => {
    try {
      // Test database connection first
      await db.$queryRaw`SELECT 1`;

      const [totalUsers, verifiedUsers, vendors, admins, usersByRole, usersByMonth] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { isVerified: true } }),
        db.user.count({ where: { role: "vendor" } }),
        db.user.count({ where: { role: "admin" } }),
        db.user.groupBy({
          by: ["role"],
          _count: true
        }),
        db.user.groupBy({
          by: ["createdAt"],
          where: {
            createdAt: {
              gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000) // Last 12 months
            }
          },
          _count: true,
          orderBy: { createdAt: "asc" }
        })
      ]);

      return httpResponse(req, res, reshttp.okCode, "User analytics retrieved successfully", {
        totalUsers,
        verifiedUsers,
        vendors,
        admins,
        verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0,
        usersByRole: usersByRole.map((role) => ({
          role: role.role,
          count: role._count
        })),
        usersByMonth: usersByMonth.map((month) => ({
          month: month.createdAt,
          count: month._count
        }))
      });
    } catch (error) {
      logger.error(`Error getting user analytics: ${String(error)}`);

      // Check if it's a database connection error
      if (String(error).includes("Can't reach database server")) {
        return httpResponse(req, res, 503, "Database server is not accessible. Please check database connection.");
      }

      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get user analytics");
    }
  }),

  /**
   * Get product analytics (Admin JWT Auth)
   */
  getProductAnalytics: asyncHandler(async (req: Request, res: Response) => {
    try {
      // Test database connection first
      await db.$queryRaw`SELECT 1`;

      const [totalAccessories, totalFashion, totalMeditation, totalDecoration, totalHomeLiving, totalDigitalBooks, totalMusic] = await Promise.all([
        db.accessories.count(),
        db.fashion.count(),
        db.meditation.count(),
        db.decoration.count(),
        db.homeAndLiving.count(),
        db.digitalBook.count(),
        db.music.count()
      ]);

      const totalProducts = totalAccessories + totalFashion + totalMeditation + totalDecoration + totalHomeLiving + totalDigitalBooks + totalMusic;

      const productsByCategory = [
        { category: "Accessories", count: totalAccessories },
        { category: "Fashion", count: totalFashion },
        { category: "Meditation", count: totalMeditation },
        { category: "Decoration", count: totalDecoration },
        { category: "Home & Living", count: totalHomeLiving },
        { category: "Digital Books", count: totalDigitalBooks },
        { category: "Music", count: totalMusic }
      ];

      return httpResponse(req, res, reshttp.okCode, "Product analytics retrieved successfully", {
        totalProducts,
        productsByCategory,
        categoryBreakdown: {
          accessories: totalAccessories,
          fashion: totalFashion,
          meditation: totalMeditation,
          decoration: totalDecoration,
          homeLiving: totalHomeLiving,
          digitalBooks: totalDigitalBooks,
          music: totalMusic
        }
      });
    } catch (error) {
      logger.error(`Error getting product analytics: ${String(error)}`);

      // Check if it's a database connection error
      if (String(error).includes("Can't reach database server")) {
        return httpResponse(req, res, 503, "Database server is not accessible. Please check database connection.");
      }

      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get product analytics");
    }
  }),

  /**
   * Get order analytics (Admin JWT Auth)
   */
  getOrderAnalytics: asyncHandler(async (req: Request, res: Response) => {
    try {
      // Test database connection first
      await db.$queryRaw`SELECT 1`;

      const [totalOrders, paidOrders, pendingOrders, cancelledOrders, ordersByStatus, ordersByMonth] = await Promise.all([
        db.order.count(),
        db.order.count({ where: { paymentStatus: "PAID" } }),
        db.order.count({ where: { paymentStatus: "PENDING" } }),
        db.order.count({ where: { status: "CANCELLED" } }),
        db.order.groupBy({
          by: ["status"],
          _count: true
        }),
        db.order.groupBy({
          by: ["createdAt"],
          where: {
            createdAt: {
              gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000) // Last 12 months
            }
          },
          _count: true,
          orderBy: { createdAt: "asc" }
        })
      ]);

      return httpResponse(req, res, reshttp.okCode, "Order analytics retrieved successfully", {
        totalOrders,
        paidOrders,
        pendingOrders,
        cancelledOrders,
        paymentSuccessRate: totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0,
        ordersByStatus: ordersByStatus.map((status) => ({
          status: status.status,
          count: status._count
        })),
        ordersByMonth: ordersByMonth.map((month) => ({
          month: month.createdAt,
          count: month._count
        }))
      });
    } catch (error) {
      logger.error(`Error getting order analytics: ${String(error)}`);

      // Check if it's a database connection error
      if (String(error).includes("Can't reach database server")) {
        return httpResponse(req, res, 503, "Database server is not accessible. Please check database connection.");
      }

      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get order analytics");
    }
  })
};
