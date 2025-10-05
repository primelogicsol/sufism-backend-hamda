import type { Prisma } from "@prisma/client";
import { ProductCategory, InventoryChangeType, StockAdjustmentType } from "@prisma/client";
import { db } from "../configs/database.js";
import logger from "../utils/loggerUtils.js";

export interface InventoryUpdateParams {
  productId: number;
  productCategory: ProductCategory;
  quantityChange: number;
  changeType: InventoryChangeType;
  reason?: string;
  orderId?: number;
  userId: string;
}

export interface StockAdjustmentParams {
  productId: number;
  productCategory: ProductCategory;
  adjustmentType: StockAdjustmentType;
  quantity: number;
  reason: string;
  notes?: string;
  userId: string;
}

export interface LowStockAlertParams {
  productId: number;
  productCategory: ProductCategory;
  currentStock: number;
  threshold?: number;
  userId: string;
}

export class InventoryService {
  /**
   * Get the current stock of a product
   */

  // eslint-disable-next-line no-unused-vars
  static async getProductStock(productId: number, productCategory: ProductCategory, _args?: unknown): Promise<number> {
    try {
      const model = this.getProductModel(productCategory);
      // eslint-disable-next-line no-unused-vars
      const product = await (model as { findUnique: (_args: unknown) => Promise<{ stock: number } | null> }).findUnique({
        where: { id: productId },
        select: { stock: true }
      });

      return product?.stock || 0;
    } catch (error) {
      logger.error(`Error getting product stock: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Update product stock and create inventory log
   */
  static async updateStock(params: InventoryUpdateParams): Promise<{ success: boolean; newStock: number; message: string }> {
    const { productId, productCategory, quantityChange, changeType, reason, orderId, userId } = params;

    try {
      // Get current stock
      const currentStock = await this.getProductStock(productId, productCategory);
      const newStock = currentStock + quantityChange;

      // Validate stock doesn't go negative
      if (newStock < 0) {
        return {
          success: false,
          newStock: currentStock,
          message: `Insufficient stock. Available: ${currentStock}, Requested: ${Math.abs(quantityChange)}`
        };
      }

      // Update product stock
      const model = this.getProductModel(productCategory);
      // eslint-disable-next-line no-unused-vars
      await (model as { update: (_args: unknown) => Promise<unknown> }).update({
        where: { id: productId },
        data: { stock: newStock }
      });

      // Create inventory log
      await db.inventoryLog.create({
        data: {
          productId,
          productCategory,
          changeType,
          quantityChange,
          previousStock: currentStock,
          newStock,
          reason,
          orderId,
          userId
        }
      });

      // Check for low stock alert
      await this.checkLowStockAlert({
        productId,
        productCategory,
        currentStock: newStock,
        userId
      });

      logger.info(`Stock updated for product ${productId}: ${currentStock} -> ${newStock} (${changeType})`);

      return {
        success: true,
        newStock,
        message: `Stock updated successfully. New stock: ${newStock}`
      };
    } catch (error) {
      logger.error(`Error updating stock: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Validate stock availability for multiple products
   */
  static async validateStockAvailability(
    items: Array<{ productId: number; productCategory: ProductCategory; quantity: number }>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      for (const item of items) {
        const currentStock = await this.getProductStock(item.productId, item.productCategory);

        if (currentStock < item.quantity) {
          errors.push(
            `Product ID ${item.productId} (${item.productCategory}): Insufficient stock. Available: ${currentStock}, Requested: ${item.quantity}`
          );
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error(`Error validating stock: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Reserve stock for an order (reduce stock temporarily)
   */
  static async reserveStock(
    items: Array<{ productId: number; productCategory: ProductCategory; quantity: number }>,
    orderId: number,
    userId: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // First validate stock availability
      const validation = await this.validateStockAvailability(items);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      // Reserve stock for each item
      for (const item of items) {
        const result = await this.updateStock({
          productId: item.productId,
          productCategory: item.productCategory,
          quantityChange: -item.quantity, // Negative to reduce stock
          changeType: InventoryChangeType.SALE,
          reason: `Order ${orderId} - Stock reserved`,
          orderId,
          userId
        });

        if (!result.success) {
          errors.push(result.message);
        }
      }

      return {
        success: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error(`Error reserving stock: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Release reserved stock (increase stock back)
   */
  static async releaseStock(
    items: Array<{ productId: number; productCategory: ProductCategory; quantity: number }>,
    orderId: number,
    userId: string,
    reason: string = "Order cancelled"
  ): Promise<void> {
    try {
      for (const item of items) {
        await this.updateStock({
          productId: item.productId,
          productCategory: item.productCategory,
          quantityChange: item.quantity, // Positive to increase stock
          changeType: InventoryChangeType.RETURN,
          reason: `Order ${orderId} - ${reason}`,
          orderId,
          userId
        });
      }
    } catch (error) {
      logger.error(`Error releasing stock: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Manual stock adjustment
   */
  static async adjustStock(params: StockAdjustmentParams): Promise<{ success: boolean; newStock: number; message: string }> {
    const { productId, productCategory, adjustmentType, quantity, reason, notes, userId } = params;

    try {
      const currentStock = await this.getProductStock(productId, productCategory);
      let quantityChange: number;
      let newStock: number;

      switch (adjustmentType) {
        case StockAdjustmentType.INCREASE:
          quantityChange = quantity;
          newStock = currentStock + quantity;
          break;
        case StockAdjustmentType.DECREASE:
          quantityChange = -quantity;
          newStock = currentStock - quantity;
          break;
        case StockAdjustmentType.SET:
          quantityChange = quantity - currentStock;
          newStock = quantity;
          break;
        default:
          throw new Error("Invalid adjustment type");
      }

      // Validate stock doesn't go negative
      if (newStock < 0) {
        return {
          success: false,
          newStock: currentStock,
          message: `Cannot adjust stock below zero. Current: ${currentStock}, Adjustment: ${quantityChange}`
        };
      }

      // Update stock
      const result = await this.updateStock({
        productId,
        productCategory,
        quantityChange,
        changeType: InventoryChangeType.ADJUSTMENT,
        reason: `${reason}${notes ? ` - ${notes}` : ""}`,
        userId
      });

      // Create stock adjustment record
      await db.stockAdjustment.create({
        data: {
          productId,
          productCategory,
          adjustmentType,
          quantity,
          reason,
          notes,
          userId
        }
      });

      return result;
    } catch (error) {
      logger.error(`Error adjusting stock: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Check and create low stock alert
   */
  static async checkLowStockAlert(params: LowStockAlertParams): Promise<void> {
    const { productId, productCategory, currentStock, threshold = 10, userId } = params;

    try {
      // Check if already has unresolved alert
      const existingAlert = await db.lowStockAlert.findFirst({
        where: {
          productId,
          productCategory,
          isResolved: false
        }
      });

      if (currentStock <= threshold && !existingAlert) {
        // Create low stock alert
        await db.lowStockAlert.create({
          data: {
            productId,
            productCategory,
            currentStock,
            threshold,
            userId
          }
        });

        logger.warn(`Low stock alert created for product ${productId}: ${currentStock} <= ${threshold}`);
      } else if (currentStock > threshold && existingAlert) {
        // Resolve existing alert
        await db.lowStockAlert.update({
          where: { id: existingAlert.id },
          data: {
            isResolved: true,
            resolvedAt: new Date()
          }
        });

        logger.info(`Low stock alert resolved for product ${productId}: ${currentStock} > ${threshold}`);
      }
    } catch (error) {
      logger.error(`Error checking low stock alert: ${String(error)}`);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get inventory logs for a product
   */
  static async getInventoryLogs(productId: number, productCategory: ProductCategory, limit: number = 50): Promise<unknown[]> {
    try {
      return await db.inventoryLog.findMany({
        where: {
          productId,
          productCategory
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          order: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: limit
      });
    } catch (error) {
      logger.error(`Error getting inventory logs: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get low stock alerts
   */
  static async getLowStockAlerts(userId?: string, resolved: boolean = false): Promise<unknown[]> {
    try {
      const where: Prisma.LowStockAlertWhereInput = {
        isResolved: resolved
      };

      if (userId) {
        where.userId = userId;
      }

      return await db.lowStockAlert.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    } catch (error) {
      logger.error(`Error getting low stock alerts: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get stock adjustment history
   */
  static async getStockAdjustments(userId?: string, limit: number = 50): Promise<unknown[]> {
    try {
      const where: Prisma.StockAdjustmentWhereInput = {};

      if (userId) {
        where.userId = userId;
      }

      return await db.stockAdjustment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: limit
      });
    } catch (error) {
      logger.error(`Error getting stock adjustments: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get product model based on category
   */
  private static getProductModel(productCategory: ProductCategory) {
    switch (productCategory) {
      case ProductCategory.MUSIC:
        return db.music;
      case ProductCategory.DIGITAL_BOOK:
        return db.digitalBook;
      case ProductCategory.FASHION:
        return db.fashion;
      case ProductCategory.MEDITATION:
        return db.meditation;
      case ProductCategory.DECORATION:
        return db.decoration;
      case ProductCategory.HOME_LIVING:
        return db.homeAndLiving;
      case ProductCategory.ACCESSORIES:
        return db.accessories;
      default:
        throw new Error(`Unknown product category: ${String(productCategory)}`);
    }
  }

  /**
   * Get inventory summary for a vendor
   */
  static async getInventorySummary(userId: string): Promise<{
    totalProducts: number;
    totalStock: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    recentMovements: number;
  }> {
    try {
      // Get all products for the vendor
      const products = await Promise.all([
        db.music.findMany({ where: { userId, isDelete: false }, select: { stock: true } }),
        db.digitalBook.findMany({ where: { userId, isDelete: false }, select: { stock: true } }),
        db.fashion.findMany({ where: { userId, isDelete: false }, select: { stock: true } }),
        db.meditation.findMany({ where: { userId, isDelete: false }, select: { stock: true } }),
        db.decoration.findMany({ where: { userId, isDelete: false }, select: { stock: true } }),
        db.homeAndLiving.findMany({ where: { userId, isDelete: false }, select: { stock: true } }),
        db.accessories.findMany({ where: { userId, isDelete: false }, select: { stock: true } })
      ]);

      const allProducts = products.flat();
      const totalProducts = allProducts.length;
      const totalStock = allProducts.reduce((sum: number, product) => sum + (product.stock ?? 0), 0);
      const lowStockProducts = allProducts.filter((product) => product.stock <= 10 && product.stock > 0).length;
      const outOfStockProducts = allProducts.filter((product) => product.stock === 0).length;

      // Get recent inventory movements (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentMovements = await db.inventoryLog.count({
        where: {
          userId,
          createdAt: {
            gte: sevenDaysAgo
          }
        }
      });

      return {
        totalProducts,
        totalStock,
        lowStockProducts,
        outOfStockProducts,
        recentMovements
      };
    } catch (error) {
      logger.error(`Error getting inventory summary: ${String(error)}`);
      throw error;
    }
  }
}
