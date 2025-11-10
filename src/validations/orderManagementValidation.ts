import { z } from "zod";
import { OrderStatus, PaymentStatus, CancellationReason, OrderPriority } from "@prisma/client";

export const orderStatusUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  priority: z.nativeEnum(OrderPriority).optional(),
  trackingNumber: z.string().optional(),
  estimatedDelivery: z.string().datetime().optional(),
  actualDelivery: z.string().datetime().optional(),
  reason: z.string().optional(),
  notes: z.string().optional()
});

export const orderCancellationSchema = z.object({
  reason: z.nativeEnum(CancellationReason),
  notes: z.string().optional(),
  refundAmount: z.number().positive().optional()
});

export const orderNoteSchema = z.object({
  note: z.string().min(1, "Note content is required"),
  isInternal: z.boolean().default(false)
});

export const bulkUpdateSchema = z.object({
  orderIds: z.array(z.number().positive()).min(1, "At least one order ID is required"),
  status: z.nativeEnum(OrderStatus),
  reason: z.string().optional()
});

export const orderSearchSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  priority: z.nativeEnum(OrderPriority).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  amountMin: z.number().positive().optional(),
  amountMax: z.number().positive().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
});

export const orderAnalyticsSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
  groupBy: z.enum(["day", "week", "month"]).default("day")
});
