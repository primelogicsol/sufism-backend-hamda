import { z } from "zod";
import { ShippingMethod, ShippingStatus, Carrier, ReturnStatus, ReturnReason } from "@prisma/client";

export const shippingRateRequestSchema = z.object({
  destination: z.object({
    country: z.string().min(1, "Country is required"),
    zip: z.string().min(1, "ZIP code is required")
  }),
  weight: z.number().positive("Weight must be positive"),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive()
    })
    .optional()
});

export const createShipmentSchema = z.object({
  trackingNumber: z.string().min(1, "Tracking number is required"),
  carrier: z.nativeEnum(Carrier),
  shippingMethod: z.nativeEnum(ShippingMethod),
  weight: z.number().positive().optional(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive()
    })
    .optional(),
  cost: z.number().positive("Cost must be positive"),
  labelUrl: z.string().url().optional(),
  trackingUrl: z.string().url().optional(),
  estimatedDelivery: z.string().datetime().optional()
});

export const updateShipmentStatusSchema = z.object({
  status: z.nativeEnum(ShippingStatus),
  actualDelivery: z.string().datetime().optional(),
  location: z.string().optional(),
  notes: z.string().optional()
});

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
    .min(1, "At least one item is required")
});

export const processReturnRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  refundAmount: z.number().positive().optional(),
  refundMethod: z.string().optional(),
  returnLabelUrl: z.string().url().optional(),
  rejectionReason: z.string().optional(),
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

export const returnAnalyticsSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d")
});

export const getUserReturnsSchema = z.object({
  status: z.nativeEnum(ReturnStatus).optional(),
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
});

export const getAllReturnsSchema = z.object({
  status: z.nativeEnum(ReturnStatus).optional(),
  reason: z.nativeEnum(ReturnReason).optional(),
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
});
