// controllers/vendorOrderController.js
import { type OrderItemStatus } from "@prisma/client";
import reshttp from "reshttp";
import type { _Request } from "../../middleware/authMiddleware.js";
import { VendorOrderService } from "../../services/vendorOrder.service.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  // Get all orders for the authenticated vendor (simplified)
  getAllVendorOrders: asyncHandler(async (req: _Request, res) => {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      amountMin,
      amountMax,
      search
    } = req.query as {
      page?: string;
      limit?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      amountMin?: string;
      amountMax?: string;
      search?: string;
    };

    const vendorId = req.userFromToken?.id;
    if (!vendorId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const searchParams = {
        vendorId,
        status: status as OrderItemStatus | undefined,
        dateFrom: startDate ? new Date(startDate) : undefined,
        dateTo: endDate ? new Date(endDate) : undefined,
        amountMin: amountMin ? Number(amountMin) : undefined,
        amountMax: amountMax ? Number(amountMax) : undefined,
        search,
        page: Number(page),
        limit: Number(limit)
      };

      const result = await VendorOrderService.getVendorOrders(searchParams);

      return httpResponse(req, res, reshttp.okCode, "Vendor orders retrieved successfully", result);
    } catch (error) {
      logger.error(`Error getting vendor orders: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor orders");
    }
  }),

  // Get details of a single order item
  getOrderItemDetail: asyncHandler(async (req: _Request, res) => {
    const { orderItemId } = req.params;
    const vendorId = req.userFromToken?.id;

    if (!vendorId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const orderItem = await VendorOrderService.getVendorOrderItem(Number(orderItemId), vendorId);

      if (!orderItem) {
        return httpResponse(req, res, reshttp.notFoundCode, "Order item not found or access denied");
      }

      return httpResponse(req, res, reshttp.okCode, "Order item retrieved successfully", orderItem);
    } catch (error) {
      logger.error(`Error getting order item detail: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get order item detail");
    }
  }),

  // Update order item status
  updateOrderItemStatus: asyncHandler(async (req: _Request, res) => {
    const { orderItemId } = req.params;
    const { status, trackingNumber, notes } = req.body as {
      status?: unknown;
      trackingNumber?: unknown;
      notes?: unknown;
    };
    const vendorId = req.userFromToken?.id;

    if (!vendorId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!status) {
      return httpResponse(req, res, reshttp.badRequestCode, "Status is required");
    }

    try {
      const result = await VendorOrderService.updateOrderItemStatus(
        Number(orderItemId),
        vendorId,
        status as OrderItemStatus,
        trackingNumber as string | undefined,
        notes as string | undefined
      );

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.orderItem);
    } catch (error) {
      logger.error(`Error updating order item status: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update order item status");
    }
  }),

  // Bulk update order item statuses
  bulkUpdateOrderItemStatus: asyncHandler(async (req: _Request, res) => {
    const { itemIds, status, trackingNumbers, notes } = req.body as {
      itemIds?: unknown;
      status?: unknown;
      trackingNumbers?: unknown;
      notes?: unknown;
    };
    const vendorId = req.userFromToken?.id;

    if (!vendorId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return httpResponse(req, res, reshttp.badRequestCode, "Item IDs array is required");
    }

    if (!status) {
      return httpResponse(req, res, reshttp.badRequestCode, "Status is required");
    }

    try {
      const result = await VendorOrderService.bulkUpdateOrderItemStatus(
        itemIds.map((id) => Number(id)),
        vendorId,
        status as OrderItemStatus,
        trackingNumbers as string[] | undefined,
        notes as string | undefined
      );

      return httpResponse(req, res, reshttp.okCode, result.message, {
        updatedCount: result.updatedCount,
        totalRequested: itemIds.length
      });
    } catch (error) {
      logger.error(`Error bulk updating order item status: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to bulk update order item status");
    }
  }),

  // Get vendor analytics
  getVendorAnalytics: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const { period = "30d", groupBy = "day" } = req.query as {
      period?: string;
      groupBy?: string;
    };

    if (!vendorId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const analyticsParams = {
        vendorId,
        period: period as "7d" | "30d" | "90d" | "1y",
        groupBy: groupBy as "day" | "week" | "month"
      };

      const analytics = await VendorOrderService.getVendorAnalytics(analyticsParams);

      return httpResponse(req, res, reshttp.okCode, "Vendor analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting vendor analytics: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor analytics");
    }
  }),

  // Get vendor order summary
  getVendorOrderSummary: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;

    if (!vendorId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const summary = await VendorOrderService.getVendorOrderSummary(vendorId);

      return httpResponse(req, res, reshttp.okCode, "Vendor order summary retrieved successfully", summary);
    } catch (error) {
      logger.error(`Error getting vendor order summary: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor order summary");
    }
  })
};
