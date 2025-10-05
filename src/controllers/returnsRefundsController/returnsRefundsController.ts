import type { ReturnStatus, ReturnReason, RefundStatus, RefundMethod, RefundType, OrderPriority } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { ReturnsRefundsService } from "../../services/returnsRefunds.service.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  /**
   * Create return request
   */
  createReturnRequest: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const { reason, description, items, isExpedited, priority, notes } = req.body as {
      reason?: unknown;
      description?: unknown;
      items?: unknown;
      isExpedited?: unknown;
      priority?: unknown;
      notes?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!reason || !description || !items || !Array.isArray(items)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Return request data is incomplete");
    }

    try {
      const returnRequestData = {
        orderId: Number(orderId),
        userId,
        reason: reason as ReturnReason,
        description: typeof description === "string" ? description : String(description as string | number | boolean),
        items: items.map((item: { productId: number; quantity: number; reason: string; condition: string; notes: string }) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          reason: item.reason as ReturnReason,
          condition: String(item.condition),
          notes: String(item.notes)
        })),
        isExpedited: Boolean(isExpedited),
        priority: (priority as OrderPriority) || "NORMAL",
        notes: notes as string | undefined
      };

      const result = await ReturnsRefundsService.createReturnRequest(returnRequestData);

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.return);
    } catch (error) {
      logger.error(`Error creating return request: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create return request");
    }
  }),

  /**
   * Process return request (approve/reject)
   */
  processReturnRequest: asyncHandler(async (req: _Request, res) => {
    const { returnId } = req.params;
    const { action, refundAmount, refundMethod, refundType, returnLabelUrl, rejectionReason, internalNotes, notes } = req.body as {
      action?: unknown;
      refundAmount?: unknown;
      refundMethod?: unknown;
      refundType?: unknown;
      returnLabelUrl?: unknown;
      rejectionReason?: unknown;
      internalNotes?: unknown;
      notes?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!action || !["approve", "reject"].includes(typeof action === "string" ? action : String(action as string | number | boolean))) {
      return httpResponse(req, res, reshttp.badRequestCode, "Valid action (approve/reject) is required");
    }

    try {
      const result = await ReturnsRefundsService.processReturnRequest(Number(returnId), action as "approve" | "reject", userId, {
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
        refundMethod: refundMethod as RefundMethod,
        refundType: refundType as RefundType,
        returnLabelUrl: returnLabelUrl as string | undefined,
        rejectionReason: rejectionReason as string | undefined,
        internalNotes: internalNotes as string | undefined,
        notes: notes as string | undefined
      });

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message);
    } catch (error) {
      logger.error(`Error processing return request: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to process return request");
    }
  }),

  /**
   * Process returned items (when physically received)
   */
  processReturnedItems: asyncHandler(async (req: _Request, res) => {
    const { returnId } = req.params;
    const { items } = req.body as { items?: unknown };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!items || !Array.isArray(items)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Items array is required");
    }

    try {
      const processedItems = items.map((item: { productId: number; quantity: number; condition: string; notes: string }) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        condition: String(item.condition),
        notes: String(item.notes)
      }));

      const result = await ReturnsRefundsService.processReturnedItems(Number(returnId), userId, processedItems);

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message);
    } catch (error) {
      logger.error(`Error processing returned items: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to process returned items");
    }
  }),

  /**
   * Process refund
   */
  processRefund: asyncHandler(async (req: _Request, res) => {
    const { returnId } = req.params;
    const { amount, refundMethod, refundType, externalRefundId, notes } = req.body as {
      amount?: unknown;
      refundMethod?: unknown;
      refundType?: unknown;
      externalRefundId?: unknown;
      notes?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!amount || !refundMethod || !refundType) {
      return httpResponse(req, res, reshttp.badRequestCode, "Amount, refund method, and refund type are required");
    }

    try {
      const refundData = {
        returnId: Number(returnId),
        amount: Number(amount),
        refundMethod: refundMethod as RefundMethod,
        refundType: refundType as RefundType,
        processedBy: userId,
        externalRefundId: externalRefundId as string | undefined,
        notes: notes as string | undefined
      };

      const result = await ReturnsRefundsService.processRefund(refundData);

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.refund);
    } catch (error) {
      logger.error(`Error processing refund: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to process refund");
    }
  }),

  /**
   * Create store credit
   */
  createStoreCredit: asyncHandler(async (req: _Request, res) => {
    const {
      userId: targetUserId,
      amount,
      reason,
      returnId,
      expiresAt,
      notes
    } = req.body as {
      userId?: unknown;
      amount?: unknown;
      reason?: unknown;
      returnId?: unknown;
      expiresAt?: unknown;
      notes?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!targetUserId || !amount || !reason) {
      return httpResponse(req, res, reshttp.badRequestCode, "User ID, amount, and reason are required");
    }

    try {
      const storeCreditData = {
        userId: typeof targetUserId === "string" ? targetUserId : String(targetUserId as string | number | boolean),
        amount: Number(amount),
        reason: typeof reason === "string" ? reason : String(reason as string | number | boolean),
        returnId: returnId ? Number(returnId) : undefined,
        expiresAt: expiresAt ? new Date(typeof expiresAt === "string" ? expiresAt : String(expiresAt as string | number | boolean)) : undefined,
        notes: notes as string | undefined
      };

      const result = await ReturnsRefundsService.createStoreCredit(storeCreditData);

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.storeCredit);
    } catch (error) {
      logger.error(`Error creating store credit: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create store credit");
    }
  }),

  /**
   * Get user's store credits
   */
  getUserStoreCredits: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const storeCredits = await ReturnsRefundsService.getUserStoreCredits(userId);

      return httpResponse(req, res, reshttp.okCode, "Store credits retrieved successfully", storeCredits);
    } catch (error) {
      logger.error(`Error getting user store credits: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get store credits");
    }
  }),

  /**
   * Use store credit
   */
  useStoreCredit: asyncHandler(async (req: _Request, res) => {
    const { amount, orderId, notes } = req.body as {
      amount?: unknown;
      orderId?: unknown;
      notes?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!amount || !orderId) {
      return httpResponse(req, res, reshttp.badRequestCode, "Amount and order ID are required");
    }

    try {
      const result = await ReturnsRefundsService.useStoreCredit(userId, Number(amount), Number(orderId), notes as string | undefined);

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, {
        usedCredits: result.usedCredits
      });
    } catch (error) {
      logger.error(`Error using store credit: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to use store credit");
    }
  }),

  /**
   * Get return by ID
   */
  getReturnById: asyncHandler(async (req: _Request, res) => {
    const { returnId } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const returnRecord = await ReturnsRefundsService.getReturnById(Number(returnId), userId);

      if (!returnRecord) {
        return httpResponse(req, res, reshttp.notFoundCode, "Return not found");
      }

      return httpResponse(req, res, reshttp.okCode, "Return retrieved successfully", returnRecord);
    } catch (error) {
      logger.error(`Error getting return: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get return");
    }
  }),

  /**
   * Search and filter returns
   */
  searchReturns: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const {
      status,
      reason,
      refundStatus,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      search,
      page = "1",
      limit = "10"
    } = req.query as {
      status?: string;
      reason?: string;
      refundStatus?: string;
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
        status: status as ReturnStatus | undefined,
        reason: reason as ReturnReason | undefined,
        refundStatus: refundStatus as RefundStatus | undefined,
        dateFrom: dateFrom ? new Date(String(dateFrom)) : undefined,
        dateTo: dateTo ? new Date(String(dateTo)) : undefined,
        amountMin: amountMin ? Number(amountMin) : undefined,
        amountMax: amountMax ? Number(amountMax) : undefined,
        search: typeof search === "string" ? search : undefined,
        page: Number(page),
        limit: Number(limit)
      };

      const result = await ReturnsRefundsService.searchReturns(searchParams);

      return httpResponse(req, res, reshttp.okCode, "Returns retrieved successfully", result);
    } catch (error) {
      logger.error(`Error searching returns: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to search returns");
    }
  }),

  /**
   * Get return analytics
   */
  getReturnAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const {
      period = "30d",
      status,
      reason
    } = req.query as {
      period?: string;
      status?: string;
      reason?: string;
    };

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const analytics = await ReturnsRefundsService.getReturnAnalytics({
        userId,
        period: period as "7d" | "30d" | "90d" | "1y",
        status: status as ReturnStatus | undefined,
        reason: reason as ReturnReason | undefined
      });

      return httpResponse(req, res, reshttp.okCode, "Return analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting return analytics: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get return analytics");
    }
  }),

  /**
   * Get vendor return analytics
   */
  getVendorReturnAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const {
      period = "30d",
      status,
      reason
    } = req.query as {
      period?: string;
      status?: string;
      reason?: string;
    };

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
    }

    try {
      const analytics = await ReturnsRefundsService.getReturnAnalytics({
        vendorId: userId,
        period: period as "7d" | "30d" | "90d" | "1y",
        status: status as ReturnStatus | undefined,
        reason: reason as ReturnReason | undefined
      });

      return httpResponse(req, res, reshttp.okCode, "Vendor return analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting vendor return analytics: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor return analytics");
    }
  }),

  /**
   * Get all returns for admin/vendor management
   */
  getAllReturns: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const {
      status,
      reason,
      refundStatus,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      search,
      page = "1",
      limit = "10"
    } = req.query as {
      status?: string;
      reason?: string;
      refundStatus?: string;
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
    if (!user || (user.role !== "admin" && user.role !== "vendor")) {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Admin or vendor role required.");
    }

    try {
      const searchParams = {
        vendorId: user.role === "vendor" ? userId : undefined,
        status: status as ReturnStatus | undefined,
        reason: reason as ReturnReason | undefined,
        refundStatus: refundStatus as RefundStatus | undefined,
        dateFrom: dateFrom ? new Date(String(dateFrom)) : undefined,
        dateTo: dateTo ? new Date(String(dateTo)) : undefined,
        amountMin: amountMin ? Number(amountMin) : undefined,
        amountMax: amountMax ? Number(amountMax) : undefined,
        search: typeof search === "string" ? search : undefined,
        page: Number(page),
        limit: Number(limit)
      };

      const result = await ReturnsRefundsService.searchReturns(searchParams);

      return httpResponse(req, res, reshttp.okCode, "Returns retrieved successfully", result);
    } catch (error) {
      logger.error(`Error getting all returns: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get returns");
    }
  }),

  /**
   * Bulk process return requests
   */
  bulkProcessReturns: asyncHandler(async (req: _Request, res) => {
    const { returnIds, action, refundAmount, refundMethod, refundType, rejectionReason, internalNotes, notes } = req.body as {
      returnIds?: unknown;
      action?: unknown;
      refundAmount?: unknown;
      refundMethod?: unknown;
      refundType?: unknown;
      rejectionReason?: unknown;
      internalNotes?: unknown;
      notes?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!returnIds || !Array.isArray(returnIds) || returnIds.length === 0) {
      return httpResponse(req, res, reshttp.badRequestCode, "Return IDs array is required");
    }

    if (!action || !["approve", "reject"].includes(typeof action === "string" ? action : String(action as string | number | boolean))) {
      return httpResponse(req, res, reshttp.badRequestCode, "Valid action (approve/reject) is required");
    }

    try {
      let processedCount = 0;
      const results = [];

      for (const returnId of returnIds) {
        const result = await ReturnsRefundsService.processReturnRequest(Number(returnId), action as "approve" | "reject", userId, {
          refundAmount: refundAmount ? Number(refundAmount) : undefined,
          refundMethod: refundMethod as RefundMethod,
          refundType: refundType as RefundType,
          rejectionReason: rejectionReason as string | undefined,
          internalNotes: internalNotes as string | undefined,
          notes: notes as string | undefined
        });

        results.push({
          returnId: Number(returnId),
          success: result.success,
          message: result.message
        });

        if (result.success) {
          processedCount++;
        }
      }

      return httpResponse(req, res, reshttp.okCode, `Processed ${processedCount} out of ${returnIds.length} returns`, {
        processedCount,
        totalRequested: returnIds.length,
        results
      });
    } catch (error) {
      logger.error(`Error bulk processing returns: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to bulk process returns");
    }
  })
};
