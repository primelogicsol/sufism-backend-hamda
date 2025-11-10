import { z } from "zod";

export const vendorOrderValidation = {
  updateOrderItemStatus: z.object({
    status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]),
    trackingNumber: z.string().optional(),
    notes: z.string().optional()
  }),

  bulkUpdateOrderItemStatus: z.object({
    itemIds: z.array(z.number()).min(1, "At least one item ID is required"),
    status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]),
    trackingNumbers: z.array(z.string()).optional(),
    notes: z.string().optional()
  }),

  getVendorOrders: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    amountMin: z.string().optional(),
    amountMax: z.string().optional(),
    search: z.string().optional()
  }),

  getVendorAnalytics: z.object({
    period: z.enum(["7d", "30d", "90d", "1y"]).optional(),
    groupBy: z.enum(["day", "week", "month"]).optional()
  })
};
