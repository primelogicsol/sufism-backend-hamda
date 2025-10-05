import type { Prisma, ShippingMethod, ShippingStatus, Carrier, ReturnReason, ProductCategory } from "@prisma/client";
import { db } from "../configs/database.js";
import { InventoryService } from "./inventory.service.js";
import logger from "../utils/loggerUtils.js";

export interface ShippingRate {
  carrier: Carrier;
  service: string;
  cost: number;
  estimatedDays: number;
  trackingAvailable: boolean;
}

export interface ShipmentData {
  orderId: number;
  trackingNumber: string;
  carrier: Carrier;
  shippingMethod: ShippingMethod;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  cost: number;
  labelUrl?: string;
  trackingUrl?: string;
  estimatedDelivery?: Date;
}

export interface ReturnRequest {
  orderId: number;
  userId: string;
  reason: ReturnReason;
  description: string;
  items: Array<{
    productId: number;
    quantity: number;
    reason: ReturnReason;
    condition?: string;
    notes?: string;
  }>;
}

export interface ReturnApproval {
  returnId: number;
  approvedBy: string;
  refundAmount?: number;
  refundMethod?: string;
  returnLabelUrl?: string;
  notes?: string;
}

export class ShippingFulfillmentService {
  /**
   * Calculate shipping rates for an order
   */
  static async calculateShippingRates(
    orderId: number,

    // eslint-disable-next-line no-unused-vars
    _destination: { country: string; zip: string },

    // eslint-disable-next-line no-unused-vars
    _weight: number,

    // eslint-disable-next-line no-unused-vars
    _dimensions?: { length: number; width: number; height: number }
  ): Promise<ShippingRate[]> {
    try {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // Mock shipping rate calculation
      // In a real implementation, you would integrate with carrier APIs
      const rates: ShippingRate[] = [
        {
          carrier: "FEDEX",
          service: "FedEx Ground",
          cost: 8.99,
          estimatedDays: 3,
          trackingAvailable: true
        },
        {
          carrier: "UPS",
          service: "UPS Ground",
          cost: 9.5,
          estimatedDays: 3,
          trackingAvailable: true
        },
        {
          carrier: "USPS",
          service: "Priority Mail",
          cost: 7.95,
          estimatedDays: 2,
          trackingAvailable: true
        },
        {
          carrier: "FEDEX",
          service: "FedEx 2Day",
          cost: 15.99,
          estimatedDays: 2,
          trackingAvailable: true
        },
        {
          carrier: "UPS",
          service: "UPS 2nd Day Air",
          cost: 16.5,
          estimatedDays: 2,
          trackingAvailable: true
        }
      ];

      // Filter rates based on destination, weight, and dimensions

      // eslint-disable-next-line no-unused-vars
      const filteredRates = rates.filter((_rate) => {
        // Add business logic for rate filtering
        return true;
      });

      return filteredRates;
    } catch (error) {
      logger.error(`Error calculating shipping rates: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Create shipment and generate shipping label
   */
  static async createShipment(shipmentData: ShipmentData): Promise<{ success: boolean; shipment: unknown; message: string }> {
    try {
      const { orderId, trackingNumber, carrier, shippingMethod, weight, dimensions, cost, labelUrl, trackingUrl, estimatedDelivery } = shipmentData;

      // Verify order exists and is ready for shipping
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) {
        return { success: false, shipment: null, message: "Order not found" };
      }

      if (order.status !== "PROCESSING" && order.status !== "CONFIRMED") {
        return { success: false, shipment: null, message: "Order is not ready for shipping" };
      }

      // Create shipment record
      const shipment = await db.shipment.create({
        data: {
          orderId,
          trackingNumber,
          carrier,
          shippingMethod,
          weight,
          dimensions: dimensions ? JSON.stringify(dimensions) : null,
          cost,
          labelUrl,
          trackingUrl,
          estimatedDelivery,
          status: "LABEL_CREATED"
        }
      });

      // Update order status
      await db.order.update({
        where: { id: orderId },
        data: {
          status: "SHIPPED",
          shippingStatus: "LABEL_CREATED",
          trackingNumber,
          carrier,
          shippingCost: cost,
          estimatedDelivery
        }
      });

      // Create order history entry
      await db.orderHistory.create({
        data: {
          orderId,
          status: "SHIPPED",
          previousStatus: order.status,
          changedBy: "system",
          reason: "Shipment created",
          notes: `Shipment created with ${carrier} - ${trackingNumber}`
        }
      });

      logger.info(`Shipment created for order ${orderId}: ${trackingNumber}`);

      return {
        success: true,
        shipment,
        message: "Shipment created successfully"
      };
    } catch (error) {
      logger.error(`Error creating shipment: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Update shipment status (webhook from carrier)
   */
  static async updateShipmentStatus(
    trackingNumber: string,
    status: ShippingStatus,
    additionalData?: {
      actualDelivery?: Date;
      location?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const shipment = await db.shipment.findFirst({
        where: { trackingNumber },
        include: { order: true }
      });

      if (!shipment) {
        return { success: false, message: "Shipment not found" };
      }

      // Update shipment status
      await db.shipment.update({
        where: { id: shipment.id },
        data: {
          status,
          actualDelivery: additionalData?.actualDelivery,
          notes: additionalData?.notes
        }
      });

      // Update order status based on shipment status
      let orderStatus = shipment.order.status;
      if (status === "DELIVERED") {
        orderStatus = "DELIVERED";
      } else if (status === "IN_TRANSIT") {
        orderStatus = "IN_TRANSIT";
      } else if (status === "OUT_FOR_DELIVERY") {
        orderStatus = "IN_TRANSIT";
      }

      if (orderStatus !== shipment.order.status) {
        await db.order.update({
          where: { id: shipment.orderId },
          data: {
            status: orderStatus,
            shippingStatus: status,
            actualDelivery: additionalData?.actualDelivery
          }
        });

        // Create order history entry
        await db.orderHistory.create({
          data: {
            orderId: shipment.orderId,
            status: orderStatus,
            previousStatus: shipment.order.status,
            changedBy: "system",
            reason: "Shipment status updated",
            notes: `Shipment status updated to ${status}${additionalData?.location ? ` at ${additionalData.location}` : ""}`
          }
        });
      }

      logger.info(`Shipment status updated: ${trackingNumber} -> ${status}`);

      return {
        success: true,
        message: "Shipment status updated successfully"
      };
    } catch (error) {
      logger.error(`Error updating shipment status: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get shipment tracking information
   */
  static async getShipmentTracking(trackingNumber: string): Promise<unknown> {
    try {
      const shipment = await db.shipment.findFirst({
        where: { trackingNumber },
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              },
              items: true
            }
          }
        }
      });

      if (!shipment) {
        return null;
      }

      return {
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        status: shipment.status,
        shippingMethod: shipment.shippingMethod,
        estimatedDelivery: shipment.estimatedDelivery,
        actualDelivery: shipment.actualDelivery,
        weight: shipment.weight,
        dimensions: shipment.dimensions ? (JSON.parse(String(shipment.dimensions)) as unknown) : null,
        cost: shipment.cost,
        labelUrl: shipment.labelUrl,
        trackingUrl: shipment.trackingUrl,
        notes: shipment.notes,
        order: shipment.order,
        createdAt: shipment.createdAt,
        updatedAt: shipment.updatedAt
      };
    } catch (error) {
      logger.error(`Error getting shipment tracking: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Request return for an order
   */
  static async requestReturn(returnRequest: ReturnRequest): Promise<{ success: boolean; return: unknown; message: string }> {
    try {
      const { orderId, userId, reason, description, items } = returnRequest;

      // Verify order exists and is eligible for return
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) {
        return { success: false, return: null, message: "Order not found" };
      }

      if (order.userId !== userId) {
        return { success: false, return: null, message: "Unauthorized access" };
      }

      // Check if order is eligible for return (delivered within return window)
      const returnWindowDays = 30; // 30 days return window
      const returnDeadline = new Date(order.createdAt);
      returnDeadline.setDate(returnDeadline.getDate() + returnWindowDays);

      if (new Date() > returnDeadline) {
        return { success: false, return: null, message: "Return window has expired" };
      }

      if (order.status !== "DELIVERED" && order.status !== "COMPLETED") {
        return { success: false, return: null, message: "Order must be delivered before requesting return" };
      }

      // Calculate refund amount
      const refundAmount = items.reduce((total, item) => {
        const orderItem = order.items.find((oi) => oi.productId === item.productId);
        if (orderItem) {
          return total + orderItem.price * item.quantity;
        }
        return total;
      }, 0);

      // Create return request
      const returnRecord = await db.return.create({
        data: {
          orderId,
          userId,
          reason,
          description,
          refundAmount,
          status: "REQUESTED",
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              reason: item.reason,
              condition: item.condition,
              notes: item.notes
            }))
          }
        },
        include: {
          items: true,
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              }
            }
          }
        }
      });

      logger.info(`Return requested for order ${orderId} by user ${userId}`);

      return {
        success: true,
        return: returnRecord,
        message: "Return request submitted successfully"
      };
    } catch (error) {
      logger.error(`Error requesting return: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Approve or reject return request
   */
  static async processReturnRequest(
    returnId: number,
    action: "approve" | "reject",
    processedBy: string,
    data?: {
      refundAmount?: number;
      refundMethod?: string;
      returnLabelUrl?: string;
      rejectionReason?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const returnRecord = await db.return.findUnique({
        where: { id: returnId },
        include: { order: true, items: true }
      });

      if (!returnRecord) {
        return { success: false, message: "Return request not found" };
      }

      if (returnRecord.status !== "REQUESTED") {
        return { success: false, message: "Return request has already been processed" };
      }

      if (action === "approve") {
        // Approve return
        await db.return.update({
          where: { id: returnId },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
            approvedBy: processedBy,
            refundAmount: data?.refundAmount || returnRecord.refundAmount,
            refundMethod:
              (data?.refundMethod as "ORIGINAL_PAYMENT" | "STORE_CREDIT" | "BANK_TRANSFER" | "CHECK" | "CASH" | "GIFT_CARD") || "ORIGINAL_PAYMENT",
            returnLabelUrl: data?.returnLabelUrl,
            notes: data?.notes
          }
        });

        // Create order history entry
        await db.orderHistory.create({
          data: {
            orderId: returnRecord.orderId,
            status: returnRecord.order.status,
            previousStatus: returnRecord.order.status,
            changedBy: processedBy,
            reason: "Return approved",
            notes: `Return request approved. Refund amount: $${data?.refundAmount || returnRecord.refundAmount}`
          }
        });

        logger.info(`Return request ${returnId} approved by ${processedBy}`);

        return {
          success: true,
          message: "Return request approved successfully"
        };
      } else {
        // Reject return
        await db.return.update({
          where: { id: returnId },
          data: {
            status: "REJECTED",
            rejectedAt: new Date(),
            rejectedBy: processedBy,
            rejectionReason: data?.rejectionReason,
            notes: data?.notes
          }
        });

        logger.info(`Return request ${returnId} rejected by ${processedBy}`);

        return {
          success: true,
          message: "Return request rejected"
        };
      }
    } catch (error) {
      logger.error(`Error processing return request: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Process returned items (when physically received)
   */
  static async processReturnedItems(
    returnId: number,
    processedBy: string,
    items: Array<{
      productId: number;
      quantity: number;
      condition: string;
      notes?: string;
    }>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const returnRecord = await db.return.findUnique({
        where: { id: returnId },
        include: { order: true, items: true }
      });

      if (!returnRecord) {
        return { success: false, message: "Return request not found" };
      }

      if (returnRecord.status !== "APPROVED") {
        return { success: false, message: "Return must be approved before processing" };
      }

      // Update return status
      await db.return.update({
        where: { id: returnId },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          processedAt: new Date()
        }
      });

      // Restore inventory for returned items
      for (const item of items) {
        const returnItem = returnRecord.items.find((ri) => ri.productId === item.productId);
        if (returnItem) {
          // Determine product category from order items
          const orderItem = (returnRecord.order as unknown as { items: Array<{ productId: number; category: string }> }).items.find(
            (oi: { productId: number; category: string }) => oi.productId === item.productId
          );
          if (orderItem) {
            await InventoryService.adjustStock({
              productId: item.productId,
              productCategory: orderItem.category as ProductCategory,
              adjustmentType: "INCREASE",
              quantity: item.quantity,
              reason: `Return processed - ${item.condition}`,
              notes: item.notes,
              userId: processedBy
            });
          }
        }
      }

      // Process refund if applicable
      if (returnRecord.refundAmount && returnRecord.refundMethod === "ORIGINAL_PAYMENT") {
        // In a real implementation, you would integrate with Stripe refund API here
        await db.return.update({
          where: { id: returnId },
          data: {
            status: "REFUNDED",
            processedAt: new Date()
          }
        });

        // Update order payment status
        await db.order.update({
          where: { id: returnRecord.orderId },
          data: {
            paymentStatus: "PARTIALLY_REFUNDED"
          }
        });
      }

      // Create order history entry
      await db.orderHistory.create({
        data: {
          orderId: returnRecord.orderId,
          status: returnRecord.order.status,
          previousStatus: returnRecord.order.status,
          changedBy: processedBy,
          reason: "Return processed",
          notes: `Return processed. Items received and inventory restored.`
        }
      });

      logger.info(`Return ${returnId} processed by ${processedBy}`);

      return {
        success: true,
        message: "Return processed successfully"
      };
    } catch (error) {
      logger.error(`Error processing returned items: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get return analytics
   */
  static async getReturnAnalytics(params: {
    userId?: string;
    vendorId?: string;
    period?: "7d" | "30d" | "90d" | "1y";
  }): Promise<Record<string, unknown>> {
    try {
      const { userId, vendorId, period = "30d" } = params;

      const dateFrom = new Date();
      switch (period) {
        case "7d":
          dateFrom.setDate(dateFrom.getDate() - 7);
          break;
        case "30d":
          dateFrom.setDate(dateFrom.getDate() - 30);
          break;
        case "90d":
          dateFrom.setDate(dateFrom.getDate() - 90);
          break;
        case "1y":
          dateFrom.setFullYear(dateFrom.getFullYear() - 1);
          break;
      }

      const where: Prisma.ReturnWhereInput = {
        createdAt: { gte: dateFrom }
      };

      if (userId) {
        where.userId = userId;
      }

      if (vendorId) {
        where.order = {
          items: {
            some: {
              OR: [
                { category: "MUSIC", music: { userId: vendorId } },
                { category: "DIGITAL_BOOK", digitalBook: { userId: vendorId } },
                { category: "FASHION", fashion: { userId: vendorId } },
                { category: "MEDITATION", meditation: { userId: vendorId } },
                { category: "DECORATION", decoration: { userId: vendorId } },
                { category: "HOME_LIVING", homeAndLiving: { userId: vendorId } },
                { category: "ACCESSORIES", accessories: { userId: vendorId } }
              ]
            }
          }
        };
      }

      const [totalReturns, returnsByStatus, returnsByReason, totalRefundAmount, averageRefundAmount] = await Promise.all([
        db.return.count({ where }),
        db.return.groupBy({
          by: ["status"],
          where,
          _count: { status: true }
        }),
        db.return.groupBy({
          by: ["reason"],
          where,
          _count: { reason: true }
        }),
        db.return.aggregate({
          where: { ...where, status: "REFUNDED" },
          _sum: { refundAmount: true }
        }),
        db.return.aggregate({
          where: { ...where, status: "REFUNDED" },
          _avg: { refundAmount: true }
        })
      ]);

      return {
        summary: {
          totalReturns,
          totalRefundAmount: totalRefundAmount._sum.refundAmount || 0,
          averageRefundAmount: averageRefundAmount._avg.refundAmount || 0
        },
        returnsByStatus: returnsByStatus.map((item) => ({
          status: item.status,
          count: item._count.status
        })),
        returnsByReason: returnsByReason.map((item) => ({
          reason: item.reason,
          count: item._count.reason
        }))
      };
    } catch (error) {
      logger.error(`Error getting return analytics: ${String(error)}`);
      throw error;
    }
  }
}
