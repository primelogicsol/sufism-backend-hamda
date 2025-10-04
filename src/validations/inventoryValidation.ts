import { z } from "zod";
import { ProductCategory, StockAdjustmentType } from "@prisma/client";

// Stock adjustment validation schema
export const stockAdjustmentSchema = z.object({
  productId: z
    .number({ message: "Product ID is required" })
    .int({ message: "Product ID must be an integer" })
    .positive({ message: "Product ID must be positive" }),
  
  category: z
    .string({ message: "Category is required" })
    .min(1, { message: "Category cannot be empty" })
    .refine(
      (val) => Object.values(ProductCategory).includes(val.toUpperCase() as ProductCategory),
      { message: "Invalid product category" }
    ),
  
  adjustmentType: z
    .nativeEnum(StockAdjustmentType, { message: "Invalid adjustment type" }),
  
  quantity: z
    .number({ message: "Quantity is required" })
    .int({ message: "Quantity must be an integer" })
    .positive({ message: "Quantity must be greater than 0" }),
  
  reason: z
    .string({ message: "Reason is required" })
    .min(1, { message: "Reason cannot be empty" })
    .max(500, { message: "Reason cannot exceed 500 characters" }),
  
  notes: z
    .string({ message: "Notes must be a string" })
    .max(1000, { message: "Notes cannot exceed 1000 characters" })
    .optional()
});

// Stock validation schema for multiple items
export const stockValidationSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z
          .number({ message: "Product ID is required" })
          .int({ message: "Product ID must be an integer" })
          .positive({ message: "Product ID must be positive" }),
        
        productCategory: z
          .nativeEnum(ProductCategory, { message: "Invalid product category" }),
        
        quantity: z
          .number({ message: "Quantity is required" })
          .int({ message: "Quantity must be an integer" })
          .positive({ message: "Quantity must be greater than 0" })
      })
    )
    .min(1, { message: "At least one item is required" })
    .max(50, { message: "Cannot validate more than 50 items at once" })
});

// Low stock alert threshold validation
export const lowStockThresholdSchema = z.object({
  threshold: z
    .number({ message: "Threshold is required" })
    .int({ message: "Threshold must be an integer" })
    .min(0, { message: "Threshold cannot be negative" })
    .max(1000, { message: "Threshold cannot exceed 1000" })
});

// Inventory log query parameters validation
export const inventoryLogQuerySchema = z.object({
  limit: z
    .string({ message: "Limit must be a string" })
    .regex(/^\d+$/, { message: "Limit must be a number" })
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1 && val <= 100, { message: "Limit must be between 1 and 100" })
    .optional()
    .default("50"),
  
  page: z
    .string({ message: "Page must be a string" })
    .regex(/^\d+$/, { message: "Page must be a number" })
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1, { message: "Page must be at least 1" })
    .optional()
    .default("1"),
  
  changeType: z
    .string({ message: "Change type must be a string" })
    .optional(),
  
  startDate: z
    .string({ message: "Start date must be a string" })
    .datetime({ message: "Invalid start date format" })
    .optional(),
  
  endDate: z
    .string({ message: "End date must be a string" })
    .datetime({ message: "Invalid end date format" })
    .optional()
});

// Product stock query parameters validation
export const productStockQuerySchema = z.object({
  productId: z
    .string({ message: "Product ID is required" })
    .regex(/^\d+$/, { message: "Product ID must be a number" })
    .transform((val) => parseInt(val, 10)),
  
  category: z
    .string({ message: "Category is required" })
    .min(1, { message: "Category cannot be empty" })
    .refine(
      (val) => Object.values(ProductCategory).includes(val.toUpperCase() as ProductCategory),
      { message: "Invalid product category" }
    )
});

// Bulk stock update validation
export const bulkStockUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        productId: z
          .number({ message: "Product ID is required" })
          .int({ message: "Product ID must be an integer" })
          .positive({ message: "Product ID must be positive" }),
        
        productCategory: z
          .nativeEnum(ProductCategory, { message: "Invalid product category" }),
        
        newStock: z
          .number({ message: "New stock is required" })
          .int({ message: "New stock must be an integer" })
          .min(0, { message: "New stock cannot be negative" }),
        
        reason: z
          .string({ message: "Reason is required" })
          .min(1, { message: "Reason cannot be empty" })
          .max(500, { message: "Reason cannot exceed 500 characters" })
      })
    )
    .min(1, { message: "At least one update is required" })
    .max(100, { message: "Cannot update more than 100 products at once" })
});

// Inventory summary query parameters validation
export const inventorySummaryQuerySchema = z.object({
  period: z
    .enum(["7d", "30d", "90d", "1y"], { message: "Invalid period" })
    .optional()
    .default("30d"),
  
  includeInactive: z
    .string({ message: "Include inactive must be a string" })
    .transform((val) => val === "true")
    .optional()
    .default(false)
});

// Export types for TypeScript
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type StockValidationInput = z.infer<typeof stockValidationSchema>;
export type LowStockThresholdInput = z.infer<typeof lowStockThresholdSchema>;
export type InventoryLogQueryInput = z.infer<typeof inventoryLogQuerySchema>;
export type ProductStockQueryInput = z.infer<typeof productStockQuerySchema>;
export type BulkStockUpdateInput = z.infer<typeof bulkStockUpdateSchema>;
export type InventorySummaryQueryInput = z.infer<typeof inventorySummaryQuerySchema>;

