import { ShippingMethod, ShippingStatus, Carrier, ReturnStatus, ReturnReason } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { ShippingFulfillmentService } from "../../services/shippingFulfillment.service.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  /**
   * Calculate shipping rates for an order
   */
  calculateShippingRates: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const { destination, weight, dimensions } = req.body;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!destination || !weight) {
      return httpResponse(req, res, reshttp.badRequestCode, "Destination and weight are required");
    }

    try {
      const rates = await ShippingFulfillmentService.calculateShippingRates(
        parseInt(orderId),
        destination,
        weight,
        dimensions
      );

      return httpResponse(req, res, reshttp.okCode, "Shipping rates calculated successfully", rates);
    } catch (error) {
      logger.error(`Error calculating shipping rates: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to calculate shipping rates");
    }
  }),

  /**
   * Create shipment and generate shipping label
   */
  createShipment: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const { trackingNumber, carrier, shippingMethod, weight, dimensions, cost, labelUrl, trackingUrl, estimatedDelivery } = req.body;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!trackingNumber || !carrier || !shippingMethod || !cost) {
      return httpResponse(req, res, reshttp.badRequestCode, "Required shipment data is missing");
    }

    try {
      const shipmentData = {
        orderId: parseInt(orderId),
        trackingNumber,
        carrier: carrier as Carrier,
        shippingMethod: shippingMethod as ShippingMethod,
        weight,
        dimensions,
        cost: parseFloat(cost),
        labelUrl,
        trackingUrl,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined
      };

      const result = await ShippingFulfillmentService.createShipment(shipmentData);
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.shipment);
    } catch (error) {
      logger.error(`Error creating shipment: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create shipment");
    }
  }),

  /**
   * Update shipment status (webhook from carrier)
   */
  updateShipmentStatus: asyncHandler(async (req: _Request, res) => {
    const { trackingNumber } = req.params;
    const { status, actualDelivery, location, notes } = req.body;

    if (!status) {
      return httpResponse(req, res, reshttp.badRequestCode, "Status is required");
    }

    try {
      const result = await ShippingFulfillmentService.updateShipmentStatus(
        trackingNumber,
        status as ShippingStatus,
        {
          actualDelivery: actualDelivery ? new Date(actualDelivery) : undefined,
          location,
          notes
        }
      );
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message);
    } catch (error) {
      logger.error(`Error updating shipment status: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update shipment status");
    }
  }),

  /**
   * Get shipment tracking information
   */
  getShipmentTracking: asyncHandler(async (req: _Request, res) => {
    const { trackingNumber } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const tracking = await ShippingFulfillmentService.getShipmentTracking(trackingNumber);
      
      if (!tracking) {
        return httpResponse(req, res, reshttp.notFoundCode, "Shipment not found");
      }

      return httpResponse(req, res, reshttp.okCode, "Shipment tracking retrieved successfully", tracking);
    } catch (error) {
      logger.error(`Error getting shipment tracking: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get shipment tracking");
    }
  }),

  /**
   * Request return for an order
   */
  requestReturn: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const { reason, description, items } = req.body;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!reason || !description || !items || !Array.isArray(items)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Return request data is incomplete");
    }

    try {
      const returnRequest = {
        orderId: parseInt(orderId),
        userId,
        reason: reason as ReturnReason,
        description,
        items: items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          reason: item.reason as ReturnReason,
          condition: item.condition,
          notes: item.notes
        }))
      };

      const result = await ShippingFulfillmentService.requestReturn(returnRequest);
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.return);
    } catch (error) {
      logger.error(`Error requesting return: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to request return");
    }
  }),

  /**
   * Approve or reject return request
   */
  processReturnRequest: asyncHandler(async (req: _Request, res) => {
    const { returnId } = req.params;
    const { action, refundAmount, refundMethod, returnLabelUrl, rejectionReason, notes } = req.body;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Valid action (approve/reject) is required");
    }

    try {
      const result = await ShippingFulfillmentService.processReturnRequest(
        parseInt(returnId),
        action as "approve" | "reject",
        userId,
        {
          refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
          refundMethod,
          returnLabelUrl,
          rejectionReason,
          notes
        }
      );
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message);
    } catch (error) {
      logger.error(`Error processing return request: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to process return request");
    }
  }),

  /**
   * Process returned items (when physically received)
   */
  processReturnedItems: asyncHandler(async (req: _Request, res) => {
    const { returnId } = req.params;
    const { items } = req.body;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!items || !Array.isArray(items)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Items array is required");
    }

    try {
      const processedItems = items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        condition: item.condition,
        notes: item.notes
      }));

      const result = await ShippingFulfillmentService.processReturnedItems(
        parseInt(returnId),
        userId,
        processedItems
      );
      
      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message);
    } catch (error) {
      logger.error(`Error processing returned items: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to process returned items");
    }
  }),

  /**
   * Get return analytics
   */
  getReturnAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { period = "30d" } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const analytics = await ShippingFulfillmentService.getReturnAnalytics({
        userId,
        period: period as "7d" | "30d" | "90d" | "1y"
      });
      
      return httpResponse(req, res, reshttp.okCode, "Return analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting return analytics: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get return analytics");
    }
  }),

  /**
   * Get vendor return analytics
   */
  getVendorReturnAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { period = "30d" } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Vendor role required.");
    }

    try {
      const analytics = await ShippingFulfillmentService.getReturnAnalytics({
        vendorId: userId,
        period: period as "7d" | "30d" | "90d" | "1y"
      });
      
      return httpResponse(req, res, reshttp.okCode, "Vendor return analytics retrieved successfully", analytics);
    } catch (error) {
      logger.error(`Error getting vendor return analytics: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor return analytics");
    }
  }),

  /**
   * Get all returns for a user
   */
  getUserReturns: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { status, period = "30d", page = "1", limit = "10" } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
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

      const where: any = {
        userId,
        createdAt: { gte: dateFrom }
      };

      if (status) {
        where.status = status;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [returns, total] = await Promise.all([
        db.return.findMany({
          where,
          skip,
          take: parseInt(limit as string),
          include: {
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
            },
            items: true
          },
          orderBy: { createdAt: "desc" }
        }),
        db.return.count({ where })
      ]);

      return httpResponse(req, res, reshttp.okCode, "User returns retrieved successfully", {
        returns,
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      });
    } catch (error) {
      logger.error(`Error getting user returns: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get user returns");
    }
  }),

  /**
   * Get all returns for admin/vendor management
   */
  getAllReturns: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { status, reason, period = "30d", page = "1", limit = "10" } = req.query;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || (user.role !== "admin" && user.role !== "vendor")) {
      return httpResponse(req, res, reshttp.forbiddenCode, "Access denied. Admin or vendor role required.");
    }

    try {
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

      const where: any = {
        createdAt: { gte: dateFrom }
      };

      if (status) {
        where.status = status;
      }

      if (reason) {
        where.reason = reason;
      }

      // If user is vendor, filter by their products
      if (user.role === "vendor") {
        where.order = {
          items: {
            some: {
              OR: [
                { category: "MUSIC", music: { userId: userId } },
                { category: "DIGITAL_BOOK", digitalBook: { userId: userId } },
                { category: "FASHION", fashion: { userId: userId } },
                { category: "MEDITATION", meditation: { userId: userId } },
                { category: "DECORATION", decoration: { userId: userId } },
                { category: "HOME_LIVING", homeAndLiving: { userId: userId } },
                { category: "ACCESSORIES", accessories: { userId: userId } }
              ]
            }
          }
        };
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [returns, total] = await Promise.all([
        db.return.findMany({
          where,
          skip,
          take: parseInt(limit as string),
          include: {
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
            },
            items: true
          },
          orderBy: { createdAt: "desc" }
        }),
        db.return.count({ where })
      ]);

      return httpResponse(req, res, reshttp.okCode, "Returns retrieved successfully", {
        returns,
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      });
    } catch (error) {
      logger.error(`Error getting all returns: ${error}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get returns");
    }
  })
};
