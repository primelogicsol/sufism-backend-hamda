import type { ShippingMethod, ShippingStatus, Carrier, ReturnReason } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { ShippingFulfillmentService } from "../../services/shippingFulfillment.service.js";
import type { USPSAddress } from "../../services/usps.service.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  /**
   * Calculate shipping rates for an order
   */
  calculateShippingRates: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const { destination, weight, dimensions } = req.body as {
      destination?: unknown;
      weight?: unknown;
      dimensions?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!destination || !weight) {
      return httpResponse(req, res, reshttp.badRequestCode, "Destination and weight are required");
    }

    try {
      const rates = await ShippingFulfillmentService.calculateShippingRates(
        Number(orderId),
        destination as { country: string; zip: string },
        Number(weight),
        dimensions as { length: number; width: number; height: number } | undefined
      );

      return httpResponse(req, res, reshttp.okCode, "Shipping rates calculated successfully", rates);
    } catch (error) {
      logger.error(`Error calculating shipping rates: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to calculate shipping rates");
    }
  }),

  /**
   * Create shipment and generate shipping label
   */
  createShipment: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const { trackingNumber, carrier, shippingMethod, weight, dimensions, cost, labelUrl, trackingUrl, estimatedDelivery } = req.body as {
      trackingNumber?: unknown;
      carrier?: unknown;
      shippingMethod?: unknown;
      weight?: unknown;
      dimensions?: unknown;
      cost?: unknown;
      labelUrl?: unknown;
      trackingUrl?: unknown;
      estimatedDelivery?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!trackingNumber || !carrier || !shippingMethod || !cost) {
      return httpResponse(req, res, reshttp.badRequestCode, "Required shipment data is missing");
    }

    try {
      const shipmentData = {
        orderId: Number(orderId),
        trackingNumber: typeof trackingNumber === "string" ? trackingNumber : String(trackingNumber as string | number | boolean),
        carrier: carrier as Carrier,
        shippingMethod: shippingMethod as ShippingMethod,
        weight: Number(weight),
        dimensions: dimensions as { length: number; width: number; height: number } | undefined,
        cost: Number(cost),
        labelUrl: labelUrl as string | undefined,
        trackingUrl: trackingUrl as string | undefined,
        estimatedDelivery: estimatedDelivery
          ? new Date(typeof estimatedDelivery === "string" ? estimatedDelivery : String(estimatedDelivery as string | number | boolean))
          : undefined
      };

      const result = await ShippingFulfillmentService.createShipment(shipmentData);

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.shipment);
    } catch (error) {
      logger.error(`Error creating shipment: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create shipment");
    }
  }),

  /**
   * Update shipment status (webhook from carrier)
   */
  updateShipmentStatus: asyncHandler(async (req: _Request, res) => {
    const { trackingNumber } = req.params;
    const { status, actualDelivery, location, notes } = req.body as {
      status?: unknown;
      actualDelivery?: unknown;
      location?: unknown;
      notes?: unknown;
    };

    if (!status) {
      return httpResponse(req, res, reshttp.badRequestCode, "Status is required");
    }

    try {
      const result = await ShippingFulfillmentService.updateShipmentStatus(String(trackingNumber), status as ShippingStatus, {
        actualDelivery: actualDelivery
          ? new Date(typeof actualDelivery === "string" ? actualDelivery : String(actualDelivery as string | number | boolean))
          : undefined,
        location: location as string | undefined,
        notes: notes as string | undefined
      });

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message);
    } catch (error) {
      logger.error(`Error updating shipment status: ${String(error)}`);
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
      const tracking = await ShippingFulfillmentService.getShipmentTracking(String(trackingNumber));

      if (!tracking) {
        return httpResponse(req, res, reshttp.notFoundCode, "Shipment not found");
      }

      return httpResponse(req, res, reshttp.okCode, "Shipment tracking retrieved successfully", tracking);
    } catch (error) {
      logger.error(`Error getting shipment tracking: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get shipment tracking");
    }
  }),

  /**
   * Request return for an order
   */
  requestReturn: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const { reason, description, items } = req.body as {
      reason?: unknown;
      description?: unknown;
      items?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!reason || !description || !items || !Array.isArray(items)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Return request data is incomplete");
    }

    try {
      const returnRequest = {
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
        }))
      };

      const result = await ShippingFulfillmentService.requestReturn(returnRequest);

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.return);
    } catch (error) {
      logger.error(`Error requesting return: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to request return");
    }
  }),

  /**
   * Approve or reject return request
   */
  processReturnRequest: asyncHandler(async (req: _Request, res) => {
    const { returnId } = req.params;
    const { action, refundAmount, refundMethod, returnLabelUrl, rejectionReason, notes } = req.body as {
      action?: unknown;
      refundAmount?: unknown;
      refundMethod?: unknown;
      returnLabelUrl?: unknown;
      rejectionReason?: unknown;
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
      const result = await ShippingFulfillmentService.processReturnRequest(Number(returnId), action as "approve" | "reject", userId, {
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
        refundMethod: refundMethod as string | undefined,
        returnLabelUrl: returnLabelUrl as string | undefined,
        rejectionReason: rejectionReason as string | undefined,
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

      const result = await ShippingFulfillmentService.processReturnedItems(Number(returnId), userId, processedItems);

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
   * Get return analytics
   */
  getReturnAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { period = "30d" } = req.query as { period?: string };

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
      logger.error(`Error getting return analytics: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get return analytics");
    }
  }),

  /**
   * Get vendor return analytics
   */
  getVendorReturnAnalytics: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { period = "30d" } = req.query as { period?: string };

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
      logger.error(`Error getting vendor return analytics: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor return analytics");
    }
  }),

  /**
   * Get all returns for a user
   */
  getUserReturns: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const {
      status,
      period = "30d",
      page = "1",
      limit = "10"
    } = req.query as {
      status?: string;
      period?: string;
      page?: string;
      limit?: string;
    };

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

      const where: Record<string, unknown> = {
        userId,
        createdAt: { gte: dateFrom }
      };

      if (status) {
        where.status = String(status);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [returns, total] = await Promise.all([
        db.return.findMany({
          where,
          skip,
          take: Number(limit),
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
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      logger.error(`Error getting user returns: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get user returns");
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
      period = "30d",
      page = "1",
      limit = "10"
    } = req.query as {
      status?: string;
      reason?: string;
      period?: string;
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

      const where: Record<string, unknown> = {
        createdAt: { gte: dateFrom }
      };

      if (status) {
        where.status = String(status);
      }

      if (reason) {
        where.reason = String(reason);
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

      const skip = (Number(page) - 1) * Number(limit);

      const [returns, total] = await Promise.all([
        db.return.findMany({
          where,
          skip,
          take: Number(limit),
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
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      logger.error(`Error getting all returns: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get returns");
    }
  }),

  /**
   * Generate USPS shipping label
   */
  generateUSPSLabel: asyncHandler(async (req: _Request, res) => {
    const { orderId } = req.params;
    const { fromAddress, toAddress, weight, dimensions, serviceType } = req.body as {
      fromAddress?: unknown;
      toAddress?: unknown;
      weight?: unknown;
      dimensions?: unknown;
      serviceType?: unknown;
    };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!fromAddress || !toAddress || !weight) {
      return httpResponse(req, res, reshttp.badRequestCode, "From address, to address, and weight are required");
    }

    try {
      const result = await ShippingFulfillmentService.generateUSPSLabel({
        orderId: Number(orderId),
        fromAddress: fromAddress as USPSAddress,
        toAddress: toAddress as USPSAddress,
        weight: Number(weight),
        dimensions: dimensions as { length: number; width: number; height: number } | undefined,
        serviceType: serviceType as string | undefined
      });

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.label);
    } catch (error) {
      logger.error(`Error generating USPS label: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to generate USPS label");
    }
  }),

  /**
   * Validate USPS address
   */
  validateUSPSAddress: asyncHandler(async (req: _Request, res) => {
    const { address } = req.body as { address?: unknown };
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!address) {
      return httpResponse(req, res, reshttp.badRequestCode, "Address is required");
    }

    try {
      const result = await ShippingFulfillmentService.validateUSPSAddress(address as USPSAddress);

      if (!result.success) {
        return httpResponse(req, res, reshttp.badRequestCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.validatedAddress);
    } catch (error) {
      logger.error(`Error validating USPS address: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to validate USPS address");
    }
  }),

  /**
   * Track USPS package
   */
  trackUSPSPackage: asyncHandler(async (req: _Request, res) => {
    const { trackingNumber } = req.params;
    const userId = req.userFromToken?.id;

    if (!userId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!trackingNumber) {
      return httpResponse(req, res, reshttp.badRequestCode, "Tracking number is required");
    }

    try {
      const result = await ShippingFulfillmentService.trackUSPSPackage(String(trackingNumber));

      if (!result.success) {
        return httpResponse(req, res, reshttp.notFoundCode, result.message);
      }

      return httpResponse(req, res, reshttp.okCode, result.message, result.tracking);
    } catch (error) {
      logger.error(`Error tracking USPS package: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to track USPS package");
    }
  })
};
