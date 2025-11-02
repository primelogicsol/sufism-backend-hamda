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
}

export interface OrderItemCancellationParams {
  orderItemId: number;
  reason: CancellationReason;
  notes?: string;
  cancelledBy: string;
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
      // Validate orderId
      if (!orderId || isNaN(orderId) || orderId <= 0) {
        throw new Error("Invalid order ID");
      }

      const where: Prisma.OrderWhereInput = { id: orderId };

      if (userId) {
        where.userId = userId;
      }

      const order = await db.order.findFirst({
        where,
        select: {
          id: true,
          userId: true,
          amount: true,
          stripeSessionId: true,
          fullName: true,
          country: true,
          email: true,
          sPaymentIntentId: true,
          shippingAddress: true,
          zip: true,
          phone: true,
          status: true,
          paymentStatus: true,
          priority: true,
          trackingNumber: true,
          estimatedDelivery: true,
          actualDelivery: true,
          cancellationReason: true,
          cancellationNotes: true,
          cancelledAt: true,
          cancelledBy: true,
          shippingMethod: true,
          shippingCost: true,
          selectedShippingService: true,
          estimatedDeliveryDays: true,
          carrier: true,
          shippingStatus: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          },
          items: {
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
              updatedAt: true
            }
          },
          transactions: {
            select: {
              id: true,
              orderId: true,
              amount: true,
              status: true,
              paymentMethod: true,
              stripePaymentIntentId: true,
              stripeClientSecret: true,
              gatewayData: true,
              createdAt: true,
              updatedAt: true
            }
          },
          orderHistory: {
            select: {
              id: true,
              orderId: true,
              status: true,
              previousStatus: true,
              changedBy: true,
              reason: true,
              notes: true,
              createdAt: true
            },
            orderBy: { createdAt: "desc" }
          },
          orderNotes: {
            select: {
              id: true,
              orderId: true,
              userId: true,
              note: true,
              isInternal: true,
              createdAt: true,
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
            select: {
              id: true,
              orderId: true,
              productId: true,
              productCategory: true,
              changeType: true,
              quantityChange: true,
              previousStock: true,
              newStock: true,
              reason: true,
              userId: true,
              createdAt: true
            },
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
        // Filter by vendorId directly - no need for product relations
        where.items = {
          some: {
            vendorId: vendorId
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
    const { orderId, reason, notes, cancelledBy } = params;

    try {
      // Get order with items and transactions
      const order = await db.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          userId: true,
          amount: true,
          paymentStatus: true,
          status: true,
          items: {
            select: {
              id: true,
              productId: true,
              category: true,
              quantity: true
            }
          },
          transactions: {
            where: { status: "SUCCEEDED" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              amount: true,
              status: true
            }
          }
        }
      });

      if (!order) {
        return { success: false, message: "Order not found" };
      }

      // Check if order can be cancelled
      const cancellationCheck = this.canCancelOrder(order.status);
      if (!cancellationCheck.allowed) {
        return { success: false, message: cancellationCheck.message || `Order cannot be cancelled in ${order.status} status` };
      }

      // Release reserved stock
      const stockReleaseItems = order.items.map((item) => ({
        productId: item.productId,
        productCategory: item.category,
        quantity: item.quantity
      }));

      await InventoryService.releaseStock(stockReleaseItems, orderId, order.userId, `Order cancelled: ${reason}`);

      // Calculate refund amount automatically from order payment
      let actualRefundAmount = 0;
      const shouldRefund = order.paymentStatus === "PAID" || order.transactions.length > 0;

      if (shouldRefund) {
        // Use transaction amount if available (most accurate), otherwise use order amount
        if (order.transactions.length > 0 && order.transactions[0]) {
          actualRefundAmount = order.transactions[0].amount;
        } else {
          actualRefundAmount = order.amount;
        }

        logger.info(`Calculated refund amount for order ${orderId}: $${actualRefundAmount}`, {
          orderAmount: order.amount,
          transactionAmount: order.transactions[0]?.amount,
          paymentStatus: order.paymentStatus
        });
      }

      // Update order status
      await db.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          cancellationReason: reason,
          cancellationNotes: notes,
          cancelledAt: new Date(),
          cancelledBy,
          ...(shouldRefund && actualRefundAmount > 0 ? { paymentStatus: "REFUNDED" } : {})
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

      // Note: Stripe refund API integration should be added here
      // Example: await stripe.refunds.create({ payment_intent: order.sPaymentIntentId, amount: actualRefundAmount * 100 })

      logger.info(`Order ${orderId} cancelled by ${cancelledBy}, reason: ${reason}`, {
        refundAmount: actualRefundAmount,
        paymentStatus: order.paymentStatus
      });

      return {
        success: true,
        message: "Order cancelled successfully",
        refundAmount: actualRefundAmount > 0 ? actualRefundAmount : undefined
      };
    } catch (error) {
      logger.error(`Error cancelling order: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Cancel a single order item and handle refunds (item amount + proportional shipping)
   */
  static async cancelOrderItem(params: OrderItemCancellationParams): Promise<{ success: boolean; message: string; refundAmount?: number }> {
    const { orderItemId, reason, notes, cancelledBy } = params;

    try {
      // Get order item with order details
      const orderItem = await db.orderItem.findFirst({
        where: { id: orderItemId },
        select: {
          id: true,
          orderId: true,
          productId: true,
          category: true,
          quantity: true,
          price: true,
          status: true,
          order: {
            select: {
              id: true,
              userId: true,
              amount: true,
              shippingCost: true,
              paymentStatus: true,
              status: true,
              items: {
                select: {
                  id: true,
                  productId: true,
                  quantity: true,
                  price: true,
                  status: true
                }
              },
              transactions: {
                where: { status: "SUCCEEDED" },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: {
                  id: true,
                  amount: true,
                  status: true
                }
              }
            }
          }
        }
      });

      if (!orderItem) {
        return { success: false, message: "Order item not found" };
      }

      const order = orderItem.order;

      // Verify ownership
      if (order.userId !== cancelledBy) {
        return { success: false, message: "Unauthorized access" };
      }

      // Check if order item is already cancelled
      if (orderItem.status === "CANCELLED" || orderItem.status === "RETURNED") {
        return { success: false, message: "Order item is already cancelled or returned" };
      }

      // Check if order can have items cancelled
      const cancellationCheck = this.canCancelOrder(order.status);
      if (!cancellationCheck.allowed) {
        return { success: false, message: cancellationCheck.message || `Order items cannot be cancelled in ${order.status} status` };
      }

      // Calculate item value
      const itemValue = orderItem.price * orderItem.quantity;

      // Calculate proportional shipping cost for this item
      // Formula: (item_value / total_order_items_value) * shipping_cost
      const totalItemsValue = order.items.reduce((sum, item) => {
        // Only count non-cancelled items
        if (item.status !== "CANCELLED" && item.status !== "RETURNED") {
          return sum + item.price * item.quantity;
        }
        return sum;
      }, 0);

      let proportionalShippingCost = 0;
      if (totalItemsValue > 0 && order.shippingCost > 0) {
        proportionalShippingCost = (itemValue / totalItemsValue) * order.shippingCost;
        // Round to 2 decimal places
        proportionalShippingCost = Math.round(proportionalShippingCost * 100) / 100;
      }

      // Calculate total refund amount (item value + proportional shipping)
      const refundAmount = itemValue + proportionalShippingCost;

      // Release stock for this item only
      await InventoryService.releaseStock(
        [
          {
            productId: orderItem.productId,
            productCategory: orderItem.category,
            quantity: orderItem.quantity
          }
        ],
        order.id,
        order.userId,
        `Order item cancelled: ${reason}`
      );

      // Update order item status (update only, don't fetch related data to avoid non-existent columns)
      await db.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: "CANCELLED"
        },
        select: {
          id: true,
          status: true
        }
      });

      // Check if all items are cancelled
      const remainingItems = order.items.filter((item) => item.id !== orderItemId && item.status !== "CANCELLED" && item.status !== "RETURNED");

      // If all items are cancelled, update order status
      if (remainingItems.length === 0) {
        await db.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            cancellationReason: reason,
            cancellationNotes: notes,
            cancelledAt: new Date(),
            cancelledBy,
            // Update order amount (subtract cancelled item + shipping)
            amount: order.amount - refundAmount,
            shippingCost: order.shippingCost - proportionalShippingCost,
            ...(order.paymentStatus === "PAID" && refundAmount > 0 ? { paymentStatus: "REFUNDED" } : {})
          }
        });
      } else {
        // Partial cancellation - update order amount and shipping cost
        await db.order.update({
          where: { id: order.id },
          data: {
            amount: order.amount - refundAmount,
            shippingCost: order.shippingCost - proportionalShippingCost,
            ...(order.paymentStatus === "PAID" && refundAmount > 0 ? { paymentStatus: "PARTIALLY_REFUNDED" } : {})
          }
        });
      }

      // Create order history
      await db.orderHistory.create({
        data: {
          orderId: order.id,
          status: remainingItems.length === 0 ? "CANCELLED" : order.status,
          previousStatus: order.status,
          changedBy: cancelledBy,
          reason: `Order item ${orderItemId} cancelled: ${reason}`,
          notes: `Item: ${orderItem.productId}, Quantity: ${orderItem.quantity}, Refund: $${refundAmount.toFixed(2)} (Item: $${itemValue.toFixed(2)} + Shipping: $${proportionalShippingCost.toFixed(2)})${notes ? ` - ${notes}` : ""}`
        }
      });

      logger.info(`Order item ${orderItemId} cancelled by ${cancelledBy}`, {
        orderId: order.id,
        itemValue,
        proportionalShippingCost,
        refundAmount,
        remainingItems: remainingItems.length,
        orderStatus: remainingItems.length === 0 ? "CANCELLED" : order.status
      });

      return {
        success: true,
        message: "Order item cancelled successfully",
        refundAmount: refundAmount > 0 ? refundAmount : undefined
      };
    } catch (error) {
      logger.error(`Error cancelling order item: ${String(error)}`);
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
        // Filter by vendorId directly - no need for product relations
        where.items = {
          some: {
            vendorId: vendorId
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
  private static canCancelOrder(status: OrderStatus): { allowed: boolean; message?: string } {
    // Orders that CAN be cancelled
    const cancellableStatuses: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING"];

    if (cancellableStatuses.includes(status)) {
      return { allowed: true };
    }

    // Orders that CANNOT be cancelled (with specific messages)
    const nonCancellableStatuses: Partial<Record<OrderStatus, string>> = {
      SHIPPED: "Order has already been shipped and cannot be cancelled. Please contact support for returns.",
      IN_TRANSIT: "Order is in transit and cannot be cancelled. Please contact support for returns.",
      DELIVERED: "Order has been delivered and cannot be cancelled. Please initiate a return request instead.",
      COMPLETED: "Order has been completed and cannot be cancelled. Please initiate a return request instead.",
      CANCELLED: "Order is already cancelled.",
      RETURNED: "Order has been returned and cannot be cancelled.",
      REFUNDED: "Order has been refunded and cannot be cancelled.",
      FAILED: "Order failed and cannot be cancelled."
    };

    const specificMessage = nonCancellableStatuses[status];
    return {
      allowed: false,
      message: specificMessage || `Order cannot be cancelled in ${status} status`
    };
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
