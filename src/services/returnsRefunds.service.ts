import type { Prisma, ReturnStatus, ReturnReason, RefundStatus, RefundMethod, RefundType, OrderPriority, ProductCategory } from "@prisma/client";
import { db } from "../configs/database.js";
import { InventoryService } from "./inventory.service.js";
import logger from "../utils/loggerUtils.js";

export interface ReturnRequestData {
  orderId: number;
  userId: string;
  reason: ReturnReason;
  description: string;
  items: Array<{
    productId: number;
    quantity: number;
    reason: ReturnReason;
    condition?: string;
    notes?: string;
  }>;
  isExpedited?: boolean;
  priority?: OrderPriority;
  notes?: string;
}

export interface ReturnApprovalData {
  returnId: number;
  approvedBy: string;
  refundAmount?: number;
  refundMethod?: RefundMethod;
  refundType?: RefundType;
  returnLabelUrl?: string;
  internalNotes?: string;
  notes?: string;
}

export interface RefundProcessingData {
  returnId: number;
  amount: number;
  refundMethod: RefundMethod;
  refundType: RefundType;
  processedBy: string;
  externalRefundId?: string;
  notes?: string;
}

export interface StoreCreditData {
  userId: string;
  amount: number;
  reason: string;
  returnId?: number;
  expiresAt?: Date;
  notes?: string;
}

export interface ReturnAnalyticsParams {
  userId?: string;
  vendorId?: string;
  period?: "7d" | "30d" | "90d" | "1y";
  status?: ReturnStatus;
  reason?: ReturnReason;
}

export class ReturnsRefundsService {
  /**
   * Create a return request
   */
  static async createReturnRequest(data: ReturnRequestData): Promise<{ success: boolean; return: unknown; message: string }> {
    try {
      const { orderId, userId, reason, description, items, isExpedited = false, priority = "NORMAL", notes } = data;

      // Verify order exists and is eligible for return
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) {
        return { success: false, return: null, message: "Order not found" };
      }

      if (order.userId !== userId) {
        return { success: false, return: null, message: "Unauthorized access" };
      }

      // Check if order is eligible for return
      const returnWindowDays = 30; // Default 30 days
      const returnDeadline = new Date(order.createdAt);
      returnDeadline.setDate(returnDeadline.getDate() + returnWindowDays);

      if (new Date() > returnDeadline) {
        return { success: false, return: null, message: "Return window has expired" };
      }

      if (!["DELIVERED", "COMPLETED"].includes(order.status)) {
        return { success: false, return: null, message: "Order must be delivered before requesting return" };
      }

      // Calculate refund amount
      const refundAmount = items.reduce((total, item) => {
        const orderItem = order.items.find((oi) => oi.productId === item.productId);
        if (orderItem) {
          return total + orderItem.price * item.quantity;
        }
        return total;
      }, 0);

      // Create return request
      const returnRecord = await db.return.create({
        data: {
          orderId,
          userId,
          reason,
          description,
          refundAmount,
          status: "REQUESTED",
          isExpedited,
          priority,
          returnWindow: returnWindowDays,
          returnDeadline,
          notes,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              reason: item.reason,
              condition: item.condition,
              notes: item.notes,
              refundAmount: order.items.find((oi) => oi.productId === item.productId)?.price
                ? order.items.find((oi) => oi.productId === item.productId)!.price * item.quantity
                : 0
            }))
          }
        },
        include: {
          items: true,
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

      logger.info(`Return requested for order ${orderId} by user ${userId}`);

      return {
        success: true,
        return: returnRecord,
        message: "Return request submitted successfully"
      };
    } catch (error) {
      logger.error(`Error creating return request: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Approve or reject return request
   */
  static async processReturnRequest(
    returnId: number,
    action: "approve" | "reject",
    processedBy: string,
    data?: {
      refundAmount?: number;
      refundMethod?: RefundMethod;
      refundType?: RefundType;
      returnLabelUrl?: string;
      rejectionReason?: string;
      internalNotes?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const returnRecord = await db.return.findUnique({
        where: { id: returnId },
        include: { order: true, items: true }
      });

      if (!returnRecord) {
        return { success: false, message: "Return request not found" };
      }

      if (returnRecord.status !== "REQUESTED") {
        return { success: false, message: "Return request has already been processed" };
      }

      if (action === "approve") {
        // Approve return
        await db.return.update({
          where: { id: returnId },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
            approvedBy: processedBy,
            refundAmount: data?.refundAmount || returnRecord.refundAmount,
            refundMethod: data?.refundMethod,
            refundType: data?.refundType || "FULL_REFUND",
            returnLabelUrl: data?.returnLabelUrl,
            internalNotes: data?.internalNotes,
            notes: data?.notes
          }
        });

        // Create order history entry
        await db.orderHistory.create({
          data: {
            orderId: returnRecord.orderId,
            status: returnRecord.order.status,
            previousStatus: returnRecord.order.status,
            changedBy: processedBy,
            reason: "Return approved",
            notes: `Return request approved. Refund amount: $${data?.refundAmount || returnRecord.refundAmount}`
          }
        });

        logger.info(`Return request ${returnId} approved by ${processedBy}`);

        return {
          success: true,
          message: "Return request approved successfully"
        };
      } else {
        // Reject return
        await db.return.update({
          where: { id: returnId },
          data: {
            status: "REJECTED",
            rejectedAt: new Date(),
            rejectedBy: processedBy,
            rejectionReason: data?.rejectionReason,
            internalNotes: data?.internalNotes,
            notes: data?.notes
          }
        });

        logger.info(`Return request ${returnId} rejected by ${processedBy}`);

        return {
          success: true,
          message: "Return request rejected"
        };
      }
    } catch (error) {
      logger.error(`Error processing return request: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Process returned items (when physically received)
   */
  static async processReturnedItems(
    returnId: number,
    processedBy: string,
    items: Array<{
      productId: number;
      quantity: number;
      condition: string;
      notes?: string;
    }>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const returnRecord = await db.return.findUnique({
        where: { id: returnId },
        include: { order: true, items: true }
      });

      if (!returnRecord) {
        return { success: false, message: "Return request not found" };
      }

      if (returnRecord.status !== "APPROVED") {
        return { success: false, message: "Return must be approved before processing" };
      }

      // Update return status
      await db.return.update({
        where: { id: returnId },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          processedAt: new Date()
        }
      });

      // Restore inventory for returned items
      for (const item of items) {
        const returnItem = returnRecord.items.find((ri) => ri.productId === item.productId);
        if (returnItem) {
          // Determine product category from order items
          const orderItem = (returnRecord.order as Record<string, unknown>).items as Array<Record<string, unknown>>;
          const foundItem = orderItem.find((oi: Record<string, unknown>) => oi.productId === item.productId);
          if (orderItem) {
            const category = foundItem?.category as string;
            await InventoryService.adjustStock({
              productId: item.productId,
              productCategory: category as ProductCategory,
              adjustmentType: "INCREASE",
              quantity: item.quantity,
              reason: `Return processed - ${item.condition}`,
              notes: item.notes,
              userId: processedBy
            });
          }
        }
      }

      // Create order history entry
      await db.orderHistory.create({
        data: {
          orderId: returnRecord.orderId,
          status: returnRecord.order.status,
          previousStatus: returnRecord.order.status,
          changedBy: processedBy,
          reason: "Return processed",
          notes: `Return processed. Items received and inventory restored.`
        }
      });

      logger.info(`Return ${returnId} processed by ${processedBy}`);

      return {
        success: true,
        message: "Return processed successfully"
      };
    } catch (error) {
      logger.error(`Error processing returned items: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Process refund
   */
  static async processRefund(data: RefundProcessingData): Promise<{ success: boolean; refund: unknown; message: string }> {
    try {
      const { returnId, amount, refundMethod, refundType, processedBy, externalRefundId, notes } = data;

      const returnRecord = await db.return.findUnique({
        where: { id: returnId },
        include: { order: true }
      });

      if (!returnRecord) {
        return { success: false, refund: null, message: "Return request not found" };
      }

      if (returnRecord.status !== "RECEIVED" && returnRecord.status !== "APPROVED") {
        return { success: false, refund: null, message: "Return must be received before processing refund" };
      }

      // Create refund record
      const refund = await db.refund.create({
        data: {
          returnId,
          orderId: returnRecord.orderId,
          userId: returnRecord.userId,
          amount,
          refundMethod,
          refundType,
          status: "PROCESSING",
          externalRefundId,
          processedBy,
          notes
        }
      });

      // Update return status
      await db.return.update({
        where: { id: returnId },
        data: {
          refundStatus: "PROCESSING",
          refundId: externalRefundId
        }
      });

      // Process refund based on method
      if (refundMethod === "ORIGINAL_PAYMENT") {
        // In a real implementation, you would integrate with Stripe refund API here
        // For now, we'll simulate successful processing
        await db.refund.update({
          where: { id: refund.id },
          data: {
            status: "COMPLETED",
            processedAt: new Date()
          }
        });

        await db.return.update({
          where: { id: returnId },
          data: {
            refundStatus: "COMPLETED"
          }
        });

        // Update order payment status
        await db.order.update({
          where: { id: returnRecord.orderId },
          data: {
            paymentStatus: "PARTIALLY_REFUNDED"
          }
        });
      } else if (refundMethod === "STORE_CREDIT") {
        // Create store credit
        await this.createStoreCredit({
          userId: returnRecord.userId,
          amount,
          reason: "return_refund",
          returnId,
          notes: `Store credit for return ${returnId}`
        });

        await db.refund.update({
          where: { id: refund.id },
          data: {
            status: "COMPLETED",
            processedAt: new Date()
          }
        });

        await db.return.update({
          where: { id: returnId },
          data: {
            refundStatus: "COMPLETED"
          }
        });
      }

      logger.info(`Refund processed for return ${returnId} by ${processedBy}`);

      return {
        success: true,
        refund,
        message: "Refund processed successfully"
      };
    } catch (error) {
      logger.error(`Error processing refund: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Create store credit
   */
  static async createStoreCredit(data: StoreCreditData): Promise<{ success: boolean; storeCredit: unknown; message: string }> {
    try {
      const { userId, amount, reason, returnId, expiresAt, notes } = data;

      const storeCredit = await db.storeCredit.create({
        data: {
          userId,
          amount,
          balance: amount, // Initial balance equals amount
          reason,
          returnId,
          expiresAt,
          notes
        }
      });

      logger.info(`Store credit created for user ${userId}: $${amount}`);

      return {
        success: true,
        storeCredit,
        message: "Store credit created successfully"
      };
    } catch (error) {
      logger.error(`Error creating store credit: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get user's store credits
   */
  static async getUserStoreCredits(userId: string): Promise<unknown> {
    try {
      const storeCredits = await db.storeCredit.findMany({
        where: {
          userId,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
        },
        orderBy: { createdAt: "desc" }
      });

      const totalBalance = storeCredits.reduce((sum, credit) => sum + credit.balance, 0);

      return {
        storeCredits,
        totalBalance,
        activeCredits: storeCredits.length
      };
    } catch (error) {
      logger.error(`Error getting user store credits: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Use store credit
   */
  static async useStoreCredit(
    userId: string,
    amount: number,

    // eslint-disable-next-line no-unused-vars
    _orderId: number,

    // eslint-disable-next-line no-unused-vars
    _notes?: string
  ): Promise<{ success: boolean; message: string; usedCredits: unknown[] }> {
    try {
      const availableCredits = await db.storeCredit.findMany({
        where: {
          userId,
          isActive: true,
          balance: { gt: 0 },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
        },
        orderBy: { createdAt: "asc" } // Use oldest credits first
      });

      let remainingAmount = amount;
      const usedCredits: unknown[] = [];

      for (const credit of availableCredits) {
        if (remainingAmount <= 0) break;

        const useAmount = Math.min(remainingAmount, credit.balance);

        await db.storeCredit.update({
          where: { id: credit.id },
          data: {
            balance: credit.balance - useAmount,
            usedAt: new Date()
          }
        });

        usedCredits.push({
          creditId: credit.id,
          amount: useAmount,
          remainingBalance: credit.balance - useAmount
        });

        remainingAmount -= useAmount;
      }

      if (remainingAmount > 0) {
        return { success: false, message: "Insufficient store credit balance", usedCredits };
      }

      logger.info(`Store credit used for user ${userId}: $${amount}`);

      return {
        success: true,
        message: "Store credit used successfully",
        usedCredits
      };
    } catch (error) {
      logger.error(`Error using store credit: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get return analytics
   */
  static async getReturnAnalytics(params: ReturnAnalyticsParams): Promise<unknown> {
    try {
      const { userId, vendorId, period = "30d", status, reason } = params;

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

      const where: Prisma.ReturnWhereInput = {
        createdAt: { gte: dateFrom }
      };

      if (userId) {
        where.userId = userId;
      }

      if (status) {
        where.status = status;
      }

      if (reason) {
        where.reason = reason;
      }

      if (vendorId) {
        where.order = {
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
      }

      const [totalReturns, returnsByStatus, returnsByReason, totalRefundAmount, averageRefundAmount, returnRate] = await Promise.all([
        db.return.count({ where }),
        db.return.groupBy({
          by: ["status"],
          where,
          _count: { status: true }
        }),
        db.return.groupBy({
          by: ["reason"],
          where,
          _count: { reason: true }
        }),
        db.return.aggregate({
          where: { ...where, refundStatus: "COMPLETED" },
          _sum: { refundAmount: true }
        }),
        db.return.aggregate({
          where: { ...where, refundStatus: "COMPLETED" },
          _avg: { refundAmount: true }
        }),
        // Calculate return rate
        db.return.count({
          where: {
            ...where,
            status: { in: ["APPROVED", "RECEIVED", "REFUNDED"] }
          }
        })
      ]);

      // Get total orders for return rate calculation
      const totalOrders = await db.order.count({
        where: {
          createdAt: { gte: dateFrom },
          status: { in: ["DELIVERED", "COMPLETED"] }
        }
      });

      return {
        summary: {
          totalReturns,
          totalRefundAmount: totalRefundAmount._sum.refundAmount || 0,
          averageRefundAmount: averageRefundAmount._avg.refundAmount || 0,
          returnRate: totalOrders > 0 ? (returnRate / totalOrders) * 100 : 0
        },
        returnsByStatus: returnsByStatus.map((item) => ({
          status: item.status,
          count: item._count.status
        })),
        returnsByReason: returnsByReason.map((item) => ({
          reason: item.reason,
          count: item._count.reason
        }))
      };
    } catch (error) {
      logger.error(`Error getting return analytics: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get return by ID with full details
   */
  static async getReturnById(returnId: number, userId?: string): Promise<unknown> {
    try {
      const where: Prisma.ReturnWhereInput = { id: returnId };

      if (userId) {
        where.userId = userId;
      }

      const returnRecord = await db.return.findFirst({
        where,
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
              },
              items: true
            }
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          },
          items: true,
          refunds: {
            orderBy: { createdAt: "desc" }
          }
        }
      });

      return returnRecord;
    } catch (error) {
      logger.error(`Error getting return by ID: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Search and filter returns
   */
  static async searchReturns(params: {
    userId?: string;
    vendorId?: string;
    status?: ReturnStatus;
    reason?: ReturnReason;
    refundStatus?: RefundStatus;
    dateFrom?: Date;
    dateTo?: Date;
    amountMin?: number;
    amountMax?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    returns: unknown[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { userId, vendorId, status, reason, refundStatus, dateFrom, dateTo, amountMin, amountMax, search, page = 1, limit = 10 } = params;

      const skip = (page - 1) * limit;
      const where: Prisma.ReturnWhereInput = {};

      // User filter
      if (userId) {
        where.userId = userId;
      }

      // Vendor filter
      if (vendorId) {
        where.order = {
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
      }

      // Status filters
      if (status) {
        where.status = status;
      }
      if (reason) {
        where.reason = reason;
      }
      if (refundStatus) {
        where.refundStatus = refundStatus;
      }

      // Date filters
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      // Amount filters
      if (amountMin || amountMax) {
        where.refundAmount = {};
        if (amountMin) where.refundAmount.gte = amountMin;
        if (amountMax) where.refundAmount.lte = amountMax;
      }

      // Search filter
      if (search) {
        where.OR = [
          { id: { equals: parseInt(search) || 0 } },
          { description: { contains: search, mode: "insensitive" } },
          { trackingNumber: { contains: search, mode: "insensitive" } }
        ];
      }

      const [returns, total] = await Promise.all([
        db.return.findMany({
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
                    email: true
                  }
                }
              }
            },
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            items: true,
            refunds: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          },
          orderBy: { createdAt: "desc" }
        }),
        db.return.count({ where })
      ]);

      return {
        returns,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error(`Error searching returns: ${String(error)}`);
      throw error;
    }
  }
}
