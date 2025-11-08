import { z } from "zod";
import { ReturnStatus, ReturnReason, RefundStatus, RefundMethod, RefundType, OrderPriority } from "@prisma/client";

export const returnRequestSchema = z.object({
  reason: z.nativeEnum(ReturnReason),
  description: z.string().min(1, "Description is required"),
  items: z
    .array(
      z.object({
        productId: z.number().positive(),
        quantity: z.number().positive(),
        reason: z.nativeEnum(ReturnReason),
        condition: z.string().optional(),
        notes: z.string().optional()
      })
    )
    .min(1, "At least one item is required"),
  isExpedited: z.boolean().default(false),
  priority: z.nativeEnum(OrderPriority).default("NORMAL"),
  notes: z.string().optional()
});

export const processReturnRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  refundAmount: z.number().positive().optional(),
  refundMethod: z.nativeEnum(RefundMethod).optional(),
  refundType: z.nativeEnum(RefundType).optional(),
  returnLabelUrl: z.string().url().optional(),
  rejectionReason: z.string().optional(),
  internalNotes: z.string().optional(),
  notes: z.string().optional()
});

export const processReturnedItemsSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().positive(),
        quantity: z.number().positive(),
        condition: z.string().min(1, "Condition is required"),
        notes: z.string().optional()
      })
    )
    .min(1, "At least one item is required")
});

export const processRefundSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  refundMethod: z.nativeEnum(RefundMethod),
  refundType: z.nativeEnum(RefundType),
  externalRefundId: z.string().optional(),
  notes: z.string().optional()
});

export const createStoreCreditSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  amount: z.number().positive("Amount must be positive"),
  reason: z.string().min(1, "Reason is required"),
  returnId: z.number().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional()
});

export const useStoreCreditSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  orderId: z.number().positive("Order ID is required"),
  notes: z.string().optional()
});

export const returnSearchSchema = z.object({
  status: z.nativeEnum(ReturnStatus).optional(),
  reason: z.nativeEnum(ReturnReason).optional(),
  refundStatus: z.nativeEnum(RefundStatus).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  amountMin: z.number().positive().optional(),
  amountMax: z.number().positive().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
});

export const returnAnalyticsSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
  status: z.nativeEnum(ReturnStatus).optional(),
  reason: z.nativeEnum(ReturnReason).optional()
});

export const bulkProcessReturnsSchema = z.object({
  returnIds: z.array(z.number().positive()).min(1, "At least one return ID is required"),
  action: z.enum(["approve", "reject"]),
  refundAmount: z.number().positive().optional(),
  refundMethod: z.nativeEnum(RefundMethod).optional(),
  refundType: z.nativeEnum(RefundType).optional(),
  rejectionReason: z.string().optional(),
  internalNotes: z.string().optional(),
  notes: z.string().optional()
});
