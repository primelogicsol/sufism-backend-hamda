import type { ProductCategory } from "@prisma/client";
import { StockAdjustmentType } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { InventoryService } from "../../services/inventory.service.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  /**
   * Get inventory summary for a vendor
   */
  getInventorySummary: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
    }

    try {
      const summary = await InventoryService.getInventorySummary(userId);
      return httpResponse(req, res, reshttp.okCode, "Inventory summary retrieved successfully", summary);
    } catch (error) {
      logger.error(`Error getting inventory summary: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get inventory summary");
    }
  }),

  /**
   * Get inventory logs for a specific product
   */
  getProductInventoryLogs: asyncHandler(async (req: _Request, res) => {
    const { productId, category } = req.params;
    const { limit = "50" } = req.query as { limit?: string };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
    }

    try {
      const productCategory = category.toUpperCase() as ProductCategory;
      const logs = await InventoryService.getInventoryLogs(parseInt(productId), productCategory, parseInt(limit));

      return httpResponse(req, res, reshttp.okCode, "Inventory logs retrieved successfully", logs);
    } catch (error) {
      logger.error(`Error getting inventory logs: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get inventory logs");
    }
  }),

  /**
   * Get low stock alerts
   */
  getLowStockAlerts: asyncHandler(async (req: _Request, res) => {
    const { resolved = "false" } = req.query as { resolved?: string };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
    }

    try {
      const alerts = await InventoryService.getLowStockAlerts(userId, resolved === "true");
      return httpResponse(req, res, reshttp.okCode, "Low stock alerts retrieved successfully", alerts);
    } catch (error) {
      logger.error(`Error getting low stock alerts: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get low stock alerts");
    }
  }),

  /**
   * Get stock adjustment history
   */
  getStockAdjustments: asyncHandler(async (req: _Request, res) => {
    const { limit = "50" } = req.query as { limit?: string };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
    }

    try {
      const adjustments = await InventoryService.getStockAdjustments(userId, parseInt(limit));
      return httpResponse(req, res, reshttp.okCode, "Stock adjustments retrieved successfully", adjustments);
    } catch (error) {
      logger.error(`Error getting stock adjustments: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get stock adjustments");
    }
  }),

  /**
   * Adjust stock manually
   */
  adjustStock: asyncHandler(async (req: _Request, res) => {
    const { productId, category, adjustmentType, quantity, reason, notes } = req.body as {
      productId?: unknown;
      category?: unknown;
      adjustmentType?: unknown;
      quantity?: unknown;
      reason?: unknown;
      notes?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
    }

    // Validate required fields
    if (!productId || !category || !adjustmentType || !quantity || !reason) {
      return httpResponse(req, res, reshttp.badRequestCode, "Missing required fields: productId, category, adjustmentType, quantity, reason");
    }

    // Validate adjustment type
    if (!Object.values(StockAdjustmentType).includes(adjustmentType as StockAdjustmentType)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Invalid adjustment type");
    }

    // Validate quantity
    if (Number(quantity) <= 0) {
      return httpResponse(req, res, reshttp.badRequestCode, "Quantity must be greater than 0");
    }

    try {
      const productCategory =
        typeof category === "string"
          ? (category.toUpperCase() as ProductCategory)
          : (String(category as string | number | boolean).toUpperCase() as ProductCategory);
      const result = await InventoryService.adjustStock({
        productId: Number(productId),
        productCategory,
        adjustmentType: adjustmentType as StockAdjustmentType,
        quantity: Number(quantity),
        reason: typeof reason === "string" ? reason : String(reason as string | number | boolean),
        notes: notes ? (typeof notes === "string" ? notes : String(notes as string | number | boolean)) : undefined,
        userId
      });

      if (result.success) {
        return httpResponse(req, res, reshttp.okCode, result.message, {
          newStock: result.newStock,
          adjustmentType: adjustmentType as StockAdjustmentType,
          quantity: Number(quantity),
          reason: typeof reason === "string" ? reason : String(reason as string | number | boolean)
        });
      } else {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }
    } catch (error) {
      logger.error(`Error adjusting stock: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to adjust stock");
    }
  }),

  /**
   * Get current stock for a product
   */
  getProductStock: asyncHandler(async (req: _Request, res) => {
    const { productId, category } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
    }

    try {
      const productCategory = category.toUpperCase() as ProductCategory;
      const stock = await InventoryService.getProductStock(parseInt(productId), productCategory);

      return httpResponse(req, res, reshttp.okCode, "Product stock retrieved successfully", {
        productId: parseInt(productId),
        category: productCategory,
        currentStock: stock
      });
    } catch (error) {
      logger.error(`Error getting product stock: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get product stock");
    }
  }),

  /**
   * Validate stock for multiple products
   */
  validateStock: asyncHandler(async (req: _Request, res) => {
    const { items } = req.body as { items?: unknown };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!items || !Array.isArray(items)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Items array is required");
    }

    try {
      const validation = await InventoryService.validateStockAvailability(
        items as Array<{ productId: number; productCategory: ProductCategory; quantity: number }>
      );

      if (validation.valid) {
        return httpResponse(req, res, reshttp.okCode, "Stock validation passed", { valid: true });
      } else {
        return httpResponse(req, res, reshttp.badRequestCode, "Stock validation failed", {
          valid: false,
          errors: validation.errors
        });
      }
    } catch (error) {
      logger.error(`Error validating stock: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to validate stock");
    }
  }),

  /**
   * Get inventory dashboard data
   */
  getInventoryDashboard: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
    }

    try {
      // Get summary
      const summary = await InventoryService.getInventorySummary(userId);

      // Get recent low stock alerts
      const lowStockAlerts = await InventoryService.getLowStockAlerts(userId, false);

      // Get recent inventory movements
      const recentMovements = await InventoryService.getStockAdjustments(userId, 10);

      const dashboard = {
        summary,
        lowStockAlerts: lowStockAlerts.slice(0, 5), // Show only 5 most recent
        recentMovements: recentMovements.slice(0, 10), // Show only 10 most recent
        lastUpdated: new Date()
      };

      return httpResponse(req, res, reshttp.okCode, "Inventory dashboard retrieved successfully", dashboard);
    } catch (error) {
      logger.error(`Error getting inventory dashboard: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get inventory dashboard");
    }
  })
};
