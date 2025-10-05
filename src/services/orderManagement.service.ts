import type { Prisma, OrderStatus, PaymentStatus, CancellationReason, OrderPriority } from "@prisma/client";
import { db } from "../configs/database.js";
import { InventoryService } from "./inventory.service.js";
import logger from "../utils/loggerUtils.js";

export interface OrderUpdateParams {
  orderId: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  priority?: OrderPriority;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  reason?: string;
  notes?: string;
  userId: string;
}

export interface OrderCancellationParams {
  orderId: number;
  reason: CancellationReason;
  notes?: string;
  cancelledBy: string;
  refundAmount?: number;
}

export interface OrderSearchParams {
  userId?: string;
  vendorId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  priority?: OrderPriority;
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OrderAnalyticsParams {
  userId?: string;
  vendorId?: string;
  period?: "7d" | "30d" | "90d" | "1y";
  groupBy?: "day" | "week" | "month";
}

export class OrderManagementService {
  /**
   * Get order by ID with full details
   */
  static async getOrderById(orderId: number, userId?: string): Promise<unknown> {
    try {
      const where: Prisma.OrderWhereInput = { id: orderId };

      if (userId) {
        where.userId = userId;
      }

      const order = await db.order.findFirst({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          },
          items: {
            include: {
              order: true
            }
          },
          transactions: true,
          orderHistory: {
            orderBy: { createdAt: "desc" }
          },
          orderNotes: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  role: true
                }
              }
            },
            orderBy: { createdAt: "desc" }
          },
          inventoryLogs: {
            orderBy: { createdAt: "desc" }
          }
        }
      });

      return order;
    } catch (error) {
      logger.error(`Error getting order by ID: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Search and filter orders
   */
  static async searchOrders(params: OrderSearchParams): Promise<{
    orders: unknown[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { userId, vendorId, status, paymentStatus, priority, dateFrom, dateTo, amountMin, amountMax, search, page = 1, limit = 10 } = params;

      const skip = (page - 1) * limit;
      const where: Prisma.OrderWhereInput = {};

      // User filter
      if (userId) {
        where.userId = userId;
      }

      // Vendor filter (orders containing vendor's products)
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

      // Status filters
      if (status) {
        where.status = status;
      }
      if (paymentStatus) {
        where.paymentStatus = paymentStatus;
      }
      if (priority) {
        where.priority = priority;
      }

      // Date filters
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      // Amount filters
      if (amountMin || amountMax) {
        where.amount = {};
        if (amountMin) where.amount.gte = amountMin;
        if (amountMax) where.amount.lte = amountMax;
      }

      // Search filter
      if (search) {
        where.OR = [
          { id: { equals: parseInt(search) || 0 } },
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { trackingNumber: { contains: search, mode: "insensitive" } }
        ];
      }

      const [orders, total] = await Promise.all([
        db.order.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            items: {
              include: {
                order: true
              }
            },
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          },
          orderBy: { createdAt: "desc" }
        }),
        db.order.count({ where })
      ]);

      return {
        orders,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error(`Error searching orders: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Update order status and create history
   */
  static async updateOrderStatus(params: OrderUpdateParams): Promise<{ success: boolean; message: string; order: unknown }> {
    const { orderId, status, paymentStatus, priority, trackingNumber, estimatedDelivery, actualDelivery, reason, notes, userId } = params;

    try {
      // Get current order
      const currentOrder = await db.order.findUnique({
        where: { id: orderId },
        select: { status: true, paymentStatus: true, userId: true }
      });

      if (!currentOrder) {
        return { success: false, message: "Order not found", order: null };
      }

      // Validate status transition
      if (status && !this.isValidStatusTransition(currentOrder.status, status)) {
        return { success: false, message: `Invalid status transition from ${currentOrder.status} to ${status}`, order: null };
      }

      // Update order
      const updateData: Prisma.OrderUpdateInput = {};
      if (status) updateData.status = status;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;
      if (priority) updateData.priority = priority;
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      if (estimatedDelivery) updateData.estimatedDelivery = estimatedDelivery;
      if (actualDelivery) updateData.actualDelivery = actualDelivery;

      const updatedOrder = await db.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          items: true
        }
      });

      // Create order history
      if (status || paymentStatus) {
        await db.orderHistory.create({
          data: {
            orderId,
            status: status || currentOrder.status,
            previousStatus: currentOrder.status,
            changedBy: userId,
            reason: reason || "Status updated",
            notes
          }
        });
      }

      // Add order note if provided
      if (notes) {
        await db.orderNote.create({
          data: {
            orderId,
            userId,
            note: notes,
            isInternal: false
          }
        });
      }

      logger.info(`Order ${orderId} status updated by user ${userId}`);

      return {
        success: true,
        message: "Order status updated successfully",
        order: updatedOrder
      };
    } catch (error) {
      logger.error(`Error updating order status: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Cancel order and handle refunds
   */
  static async cancelOrder(params: OrderCancellationParams): Promise<{ success: boolean; message: string; refundAmount?: number }> {
    const { orderId, reason, notes, cancelledBy, refundAmount } = params;

    try {
      // Get order with items
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          transactions: {
            where: { status: "SUCCEEDED" },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });

      if (!order) {
        return { success: false, message: "Order not found" };
      }

      // Check if order can be cancelled
      if (!this.canCancelOrder(order.status)) {
        return { success: false, message: `Order cannot be cancelled in ${order.status} status` };
      }

      // Release reserved stock
      const stockReleaseItems = order.items.map((item) => ({
        productId: item.productId,
        productCategory: item.category,
        quantity: item.quantity
      }));

      await InventoryService.releaseStock(stockReleaseItems, orderId, order.userId, `Order cancelled: ${reason}`);

      // Update order status
      await db.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          cancellationReason: reason,
          cancellationNotes: notes,
          cancelledAt: new Date(),
          cancelledBy
        }
      });

      // Create order history
      await db.orderHistory.create({
        data: {
          orderId,
          status: "CANCELLED",
          previousStatus: order.status,
          changedBy: cancelledBy,
          reason: `Order cancelled: ${reason}`,
          notes
        }
      });

      // Process refund if payment was made
      let actualRefundAmount = 0;
      if (order.transactions.length > 0 && refundAmount) {
        // In a real implementation, you would integrate with Stripe refund API here
        actualRefundAmount = refundAmount;

        // Update payment status
        await db.order.update({
          where: { id: orderId },
          data: { paymentStatus: "REFUNDED" }
        });
      }

      logger.info(`Order ${orderId} cancelled by ${cancelledBy}, reason: ${reason}`);

      return {
        success: true,
        message: "Order cancelled successfully",
        refundAmount: actualRefundAmount
      };
    } catch (error) {
      logger.error(`Error cancelling order: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Add note to order
   */
  static async addOrderNote(
    orderId: number,
    userId: string,
    note: string,
    isInternal: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    try {
      const order = await db.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        return { success: false, message: "Order not found" };
      }

      await db.orderNote.create({
        data: {
          orderId,
          userId,
          note,
          isInternal
        }
      });

      logger.info(`Note added to order ${orderId} by user ${userId}`);

      return {
        success: true,
        message: "Note added successfully"
      };
    } catch (error) {
      logger.error(`Error adding order note: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get order analytics
   */
  static async getOrderAnalytics(params: OrderAnalyticsParams): Promise<unknown> {
    try {
      // eslint-disable-next-line no-unused-vars
      const { userId, vendorId, period = "30d", groupBy: _groupBy = "day" } = params;

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
        createdAt: { gte: dateFrom }
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

      // Get order statistics
      const [totalOrders, totalRevenue, ordersByStatus, ordersByPaymentStatus, recentOrders] = await Promise.all([
        db.order.count({ where }),
        db.order.aggregate({
          where: { ...where, paymentStatus: "PAID" },
          _sum: { amount: true }
        }),
        db.order.groupBy({
          by: ["status"],
          where,
          _count: { status: true }
        }),
        db.order.groupBy({
          by: ["paymentStatus"],
          where,
          _count: { paymentStatus: true }
        }),
        db.order.findMany({
          where,
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            items: true
          }
        })
      ]);

      return {
        summary: {
          totalOrders,
          totalRevenue: totalRevenue._sum.amount || 0,
          averageOrderValue: totalOrders > 0 ? (totalRevenue._sum.amount || 0) / totalOrders : 0
        },
        ordersByStatus: ordersByStatus.map((item) => ({
          status: item.status,
          count: item._count.status
        })),
        ordersByPaymentStatus: ordersByPaymentStatus.map((item) => ({
          paymentStatus: item.paymentStatus,
          count: item._count.paymentStatus
        })),
        recentOrders
      };
    } catch (error) {
      logger.error(`Error getting order analytics: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Bulk update order statuses
   */
  static async bulkUpdateOrderStatus(
    orderIds: number[],
    status: OrderStatus,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string; updatedCount: number }> {
    try {
      let updatedCount = 0;

      for (const orderId of orderIds) {
        const result = await this.updateOrderStatus({
          orderId,
          status,
          reason: reason || "Bulk status update",
          userId
        });

        if (result.success) {
          updatedCount++;
        }
      }

      return {
        success: true,
        message: `Updated ${updatedCount} out of ${orderIds.length} orders`,
        updatedCount
      };
    } catch (error) {
      logger.error(`Error bulk updating order status: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Validate status transition
   */
  private static isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ["CONFIRMED", "CANCELLED", "FAILED"],
      CONFIRMED: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["IN_TRANSIT", "DELIVERED"],
      IN_TRANSIT: ["DELIVERED"],
      DELIVERED: ["COMPLETED"],
      COMPLETED: ["RETURNED"],
      FAILED: ["PENDING", "CANCELLED"],
      CANCELLED: [],
      RETURNED: ["REFUNDED"],
      REFUNDED: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Check if order can be cancelled
   */
  private static canCancelOrder(status: OrderStatus): boolean {
    const cancellableStatuses: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING"];

    return cancellableStatuses.includes(status);
  }

  /**
   * Get order tracking information
   */
  static async getOrderTracking(orderId: number): Promise<unknown> {
    try {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          items: {
            include: {
              order: true
            }
          },
          orderHistory: {
            orderBy: { createdAt: "asc" }
          }
        }
      });

      if (!order) {
        return null;
      }

      return {
        orderId: order.id,
        status: order.status,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        actualDelivery: order.actualDelivery,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customer: order.user,
        items: order.items,
        timeline: order.orderHistory
      };
    } catch (error) {
      logger.error(`Error getting order tracking: ${String(error)}`);
      throw error;
    }
  }
}
