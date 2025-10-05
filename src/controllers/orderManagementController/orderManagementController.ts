import type { OrderStatus, PaymentStatus, CancellationReason, OrderPriority } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { OrderManagementService } from "../../services/orderManagement.service.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  /**
   * Get order by ID
   */
  getOrderById: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const order = await OrderManagementService.getOrderById(Number(orderId), userId);

      if (!order) {
        return httpResponse(req, res, reshttp.notFoundCode, "Order not found");
      }

      return httpResponse(req, res, reshttp.okCode, "Order retrieved successfully", order);
    } catch (error) {
      logger.error(`Error getting order: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get order");
    }
  }),

  /**
   * Search and filter orders
   */
  searchOrders: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const {
      status,
      paymentStatus,
      priority,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      search,
      page = "1",
      limit = "10"
    } = req.query as {
      status?: string;
      paymentStatus?: string;
      priority?: string;
      dateFrom?: string;
      dateTo?: string;
      amountMin?: string;
      amountMax?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const searchParams = {
        userId,
        status: status as OrderStatus | undefined,
        paymentStatus: paymentStatus as PaymentStatus | undefined,
        priority: priority as OrderPriority | undefined,
        dateFrom: dateFrom ? new Date(String(dateFrom)) : undefined,
        dateTo: dateTo ? new Date(String(dateTo)) : undefined,
        amountMin: amountMin ? Number(amountMin) : undefined,
        amountMax: amountMax ? Number(amountMax) : undefined,
        search: typeof search === "string" ? search : undefined,
        page: Number(page),
        limit: Number(limit)
      };

      const result = await OrderManagementService.searchOrders(searchParams);

      return httpResponse(req, res, reshttp.okCode, "Orders retrieved successfully", result);
    } catch (error) {
      logger.error(`Error searching orders: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to search orders");
    }
  }),

  /**
   * Update order status
   */
  updateOrderStatus: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const { status, paymentStatus, priority, trackingNumber, estimatedDelivery, actualDelivery, reason, notes } = req.body as {
      status?: unknown;
      paymentStatus?: unknown;
      priority?: unknown;
      trackingNumber?: unknown;
      estimatedDelivery?: unknown;
      actualDelivery?: unknown;
      reason?: unknown;
      notes?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const updateParams = {
        orderId: Number(orderId),
        status: status as OrderStatus | undefined,
        paymentStatus: paymentStatus as PaymentStatus | undefined,
        priority: priority as OrderPriority | undefined,
        trackingNumber: trackingNumber as string | undefined,
        estimatedDelivery: estimatedDelivery
          ? new Date(typeof estimatedDelivery === "string" ? estimatedDelivery : String(estimatedDelivery as string | number | boolean))
          : undefined,
        actualDelivery: actualDelivery
          ? new Date(typeof actualDelivery === "string" ? actualDelivery : String(actualDelivery as string | number | boolean))
          : undefined,
        reason: reason as string | undefined,
        notes: notes as string | undefined,
        userId
      };

      const result = await OrderManagementService.updateOrderStatus(updateParams);

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.order);
    } catch (error) {
      logger.error(`Error updating order status: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update order status");
    }
  }),

  /**
   * Cancel order
   */
  cancelOrder: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const { reason, notes, refundAmount } = req.body as {
      reason?: unknown;
      notes?: unknown;
      refundAmount?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!reason) {
      return httpResponse(req, res, reshttp.badRequestCode, "Cancellation reason is required");
    }

    try {
      const cancellationParams = {
        orderId: Number(orderId),
        reason: reason as CancellationReason,
        notes: notes as string | undefined,
        cancelledBy: userId,
        refundAmount: refundAmount ? Number(refundAmount) : undefined
      };

      const result = await OrderManagementService.cancelOrder(cancellationParams);

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, {
        refundAmount: result.refundAmount
      });
    } catch (error) {
      logger.error(`Error cancelling order: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to cancel order");
    }
  }),

  /**
   * Add note to order
   */
  addOrderNote: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const { note, isInternal = false } = req.body as {
      note?: unknown;
      isInternal?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!note) {
      return httpResponse(req, res, reshttp.badRequestCode, "Note content is required");
    }

    try {
      const result = await OrderManagementService.addOrderNote(
        Number(orderId),
        userId,
        typeof note === "string" ? note : String(note as string | number | boolean),
        Boolean(isInternal)
      );

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message);
    } catch (error) {
      logger.error(`Error adding order note: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to add order note");
    }
  }),

  /**
   * Get order tracking information
   */
  getOrderTracking: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const tracking = await OrderManagementService.getOrderTracking(Number(orderId));

      if (!tracking) {
        return httpResponse(req, res, reshttp.notFoundCode, "Order not found");
      }

      return httpResponse(req, res, reshttp.okCode, "Order tracking retrieved successfully", tracking);
    } catch (error) {
      logger.error(`Error getting order tracking: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get order tracking");
    }
  }),

  /**
   * Get order analytics
   */
  getOrderAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { period = "30d", groupBy = "day" } = req.query as {
      period?: string;
      groupBy?: string;
    };

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const analyticsParams = {
        userId,
        period: period as "7d" | "30d" | "90d" | "1y",
        groupBy: groupBy as "day" | "week" | "month"
      };

      const analytics = await OrderManagementService.getOrderAnalytics(analyticsParams);

      return httpResponse(req, res, reshttp.okCode, "Order analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting order analytics: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get order analytics");
    }
  }),

  /**
   * Bulk update order statuses
   */
  bulkUpdateOrderStatus: asyncHandler(async (req: _Request, res) => {
    const { orderIds, status, reason } = req.body as {
      orderIds?: unknown;
      status?: unknown;
      reason?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return httpResponse(req, res, reshttp.badRequestCode, "Order IDs array is required");
    }

    if (!status) {
      return httpResponse(req, res, reshttp.badRequestCode, "Status is required");
    }

    try {
      const result = await OrderManagementService.bulkUpdateOrderStatus(
        orderIds.map((id) => Number(id)),
        status as OrderStatus,
        userId,
        reason as string | undefined
      );

      return httpResponse(req, res, reshttp.okCode, result.message, {
        updatedCount: result.updatedCount,
        totalRequested: orderIds.length
      });
    } catch (error) {
      logger.error(`Error bulk updating order status: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to bulk update order status");
    }
  }),

  /**
   * Get vendor orders (for vendors)
   */
  getVendorOrders: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const {
      status,
      paymentStatus,
      priority,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      search,
      page = "1",
      limit = "10"
    } = req.query as {
      status?: string;
      paymentStatus?: string;
      priority?: string;
      dateFrom?: string;
      dateTo?: string;
      amountMin?: string;
      amountMax?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
    }

    try {
      const searchParams = {
        vendorId: userId,
        status: status as OrderStatus | undefined,
        paymentStatus: paymentStatus as PaymentStatus | undefined,
        priority: priority as OrderPriority | undefined,
        dateFrom: dateFrom ? new Date(String(dateFrom)) : undefined,
        dateTo: dateTo ? new Date(String(dateTo)) : undefined,
        amountMin: amountMin ? Number(amountMin) : undefined,
        amountMax: amountMax ? Number(amountMax) : undefined,
        search: typeof search === "string" ? search : undefined,
        page: Number(page),
        limit: Number(limit)
      };

      const result = await OrderManagementService.searchOrders(searchParams);

      return httpResponse(req, res, reshttp.okCode, "Vendor orders retrieved successfully", result);
    } catch (error) {
      logger.error(`Error getting vendor orders: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor orders");
    }
  }),

  /**
   * Get vendor analytics
   */
  getVendorAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { period = "30d", groupBy = "day" } = req.query as {
      period?: string;
      groupBy?: string;
    };

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
    }

    try {
      const analyticsParams = {
        vendorId: userId,
        period: period as "7d" | "30d" | "90d" | "1y",
        groupBy: groupBy as "day" | "week" | "month"
      };

      const analytics = await OrderManagementService.getOrderAnalytics(analyticsParams);

      return httpResponse(req, res, reshttp.okCode, "Vendor analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting vendor analytics: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor analytics");
    }
  })
};
