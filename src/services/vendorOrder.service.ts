import type { Prisma, OrderItemStatus } from "@prisma/client";
import { db } from "../configs/database.js";
import logger from "../utils/loggerUtils.js";

export interface VendorOrderSearchParams {
  vendorId: string;
  status?: OrderItemStatus;
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface VendorOrderAnalyticsParams {
  vendorId: string;
  period?: "7d" | "30d" | "90d" | "1y";
  groupBy?: "day" | "week" | "month";
}

export class VendorOrderService {
  /**
   * Get all orders for a specific vendor
   */
  static async getVendorOrders(params: VendorOrderSearchParams): Promise<{
    orders: unknown[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { vendorId, status, dateFrom, dateTo, amountMin, amountMax, search, page = 1, limit = 10 } = params;

      const skip = (page - 1) * limit;
      const where: Prisma.OrderItemWhereInput = {
        vendorId
      };

      // Status filter
      if (status) {
        where.status = status;
      }

      // Date filters
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      // Amount filters
      if (amountMin || amountMax) {
        where.price = {};
        if (amountMin) where.price.gte = amountMin;
        if (amountMax) where.price.lte = amountMax;
      }

      // Search filter
      if (search) {
        where.OR = [
          { id: { equals: parseInt(search) || 0 } },
          { order: { fullName: { contains: search, mode: "insensitive" } } },
          { order: { email: { contains: search, mode: "insensitive" } } },
          { order: { phone: { contains: search, mode: "insensitive" } } },
          { trackingNumber: { contains: search, mode: "insensitive" } }
        ];
      }

      const [orders, total] = await Promise.all([
        db.orderItem.findMany({
          where,
          skip,
          take: limit,
          include: {
            order: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            vendor: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }),
        db.orderItem.count({ where })
      ]);

      return {
        orders,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error(`Error getting vendor orders: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get order item by ID for vendor
   */
  static async getVendorOrderItem(itemId: number, vendorId: string): Promise<unknown> {
    try {
      const orderItem = await db.orderItem.findFirst({
        where: {
          id: itemId,
          vendorId
        },
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          vendor: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      });

      return orderItem;
    } catch (error) {
      logger.error(`Error getting vendor order item: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Update order item status
   */
  static async updateOrderItemStatus(
    itemId: number,
    vendorId: string,
    status: OrderItemStatus,
    trackingNumber?: string,
    notes?: string
  ): Promise<{ success: boolean; message: string; orderItem: unknown }> {
    try {
      // Verify the item belongs to the vendor
      const orderItem = await db.orderItem.findFirst({
        where: {
          id: itemId,
          vendorId
        }
      });

      if (!orderItem) {
        return { success: false, message: "Order item not found or access denied", orderItem: null };
      }

      // Update the order item
      const updatedOrderItem = await db.orderItem.update({
        where: { id: itemId },
        data: {
          status,
          trackingNumber,
          shippedAt: status === "SHIPPED" ? new Date() : undefined,
          deliveredAt: status === "DELIVERED" ? new Date() : undefined
        },
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              }
            }
          }
        }
      });

      // Create order history entry
      await db.orderHistory.create({
        data: {
          orderId: orderItem.orderId,
          status: status === "SHIPPED" ? "SHIPPED" : status === "DELIVERED" ? "DELIVERED" : "PROCESSING",
          previousStatus: "PROCESSING",
          changedBy: vendorId,
          reason: `Item status updated to ${status}`,
          notes: notes || `Vendor updated item status to ${status}`
        }
      });

      logger.info(`Order item ${itemId} status updated to ${status} by vendor ${vendorId}`);

      return {
        success: true,
        message: "Order item status updated successfully",
        orderItem: updatedOrderItem
      };
    } catch (error) {
      logger.error(`Error updating order item status: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get vendor analytics
   */
  static async getVendorAnalytics(params: VendorOrderAnalyticsParams): Promise<unknown> {
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

      const where: Prisma.OrderItemWhereInput = {
        vendorId,
        createdAt: { gte: dateFrom }
      };

      // Get order item statistics
      const [totalItems, totalRevenue, itemsByStatus, recentItems] = await Promise.all([
        db.orderItem.count({ where }),
        db.orderItem.aggregate({
          where: { ...where, status: { in: ["SHIPPED", "DELIVERED"] } },
          _sum: { price: true }
        }),
        db.orderItem.groupBy({
          by: ["status"],
          where,
          _count: { status: true }
        }),
        db.orderItem.findMany({
          where,
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderId: true,
            category: true,
            productId: true,
            vendorId: true,
            quantity: true,
            price: true,
            status: true,
            trackingNumber: true,
            shippedAt: true,
            deliveredAt: true,
            createdAt: true,
            updatedAt: true,
            order: {
              select: {
                id: true,
                userId: true,
                amount: true,
                status: true,
                paymentStatus: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true
                  }
                }
              }
            }
          }
        })
      ]);

      return {
        summary: {
          totalItems,
          totalRevenue: totalRevenue._sum.price || 0,
          averageItemValue: totalItems > 0 ? (totalRevenue._sum.price || 0) / totalItems : 0
        },
        itemsByStatus: itemsByStatus.map((item) => ({
          status: item.status,
          count: item._count.status
        })),
        recentItems
      };
    } catch (error) {
      logger.error(`Error getting vendor analytics: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Bulk update order item statuses
   */
  static async bulkUpdateOrderItemStatus(
    itemIds: number[],
    vendorId: string,
    status: OrderItemStatus,
    trackingNumbers?: string[],
    notes?: string
  ): Promise<{ success: boolean; message: string; updatedCount: number }> {
    try {
      let updatedCount = 0;

      for (let i = 0; i < itemIds.length; i++) {
        const itemId = itemIds[i];
        const trackingNumber = trackingNumbers?.[i];

        const result = await this.updateOrderItemStatus(itemId, vendorId, status, trackingNumber, notes);

        if (result.success) {
          updatedCount++;
        }
      }

      return {
        success: true,
        message: `Updated ${updatedCount} out of ${itemIds.length} order items`,
        updatedCount
      };
    } catch (error) {
      logger.error(`Error bulk updating order item status: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get vendor order summary
   */
  static async getVendorOrderSummary(vendorId: string): Promise<unknown> {
    try {
      const [pendingItems, processingItems, shippedItems, deliveredItems, totalRevenue] = await Promise.all([
        db.orderItem.count({ where: { vendorId, status: "PENDING" } }),
        db.orderItem.count({ where: { vendorId, status: "PROCESSING" } }),
        db.orderItem.count({ where: { vendorId, status: "SHIPPED" } }),
        db.orderItem.count({ where: { vendorId, status: "DELIVERED" } }),
        db.orderItem.aggregate({
          where: { vendorId, status: { in: ["SHIPPED", "DELIVERED"] } },
          _sum: { price: true }
        })
      ]);

      return {
        pendingItems,
        processingItems,
        shippedItems,
        deliveredItems,
        totalRevenue: totalRevenue._sum.price || 0,
        totalItems: pendingItems + processingItems + shippedItems + deliveredItems
      };
    } catch (error) {
      logger.error(`Error getting vendor order summary: ${String(error)}`);
      throw error;
    }
  }
}
