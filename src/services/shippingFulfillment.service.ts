import type { Prisma, ShippingMethod, ShippingStatus, Carrier, ReturnReason, ProductCategory } from "@prisma/client";
import { db } from "../configs/database.js";
import { InventoryService } from "./inventory.service.js";
import { USPSService, type USPSAddress } from "./usps.service.js";
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
   * Calculate shipping rates for user's cart
   */
  static async calculateShippingRatesFromCart(userId: string, destination: { country: string; zip: string }): Promise<ShippingRate[]> {
    try {
      // Get user's cart items with product details
      const cartItems = await db.cart.findMany({
        where: { userId },
        include: {
          music: true,
          digitalBook: true,
          meditation: true,
          fashion: true,
          living: true,
          decoration: true,
          accessories: true
        }
      });

      if (!cartItems || cartItems.length === 0) {
        throw new Error("Cart is empty");
      }

      // Calculate total weight and dimensions from cart items
      let totalWeight = 0;
      const totalDimensions = { length: 0, width: 0, height: 0 };

      for (const item of cartItems) {
        const product = item.music || item.digitalBook || item.meditation || item.fashion || item.living || item.decoration || item.accessories;

        if (product) {
          // Add weight for each quantity
          const itemWeight = (product as { weight?: number }).weight || 1; // Default weight if not specified
          totalWeight += itemWeight * item.qty;

          // Add dimensions (simplified - in real scenario you'd calculate package dimensions)
          const itemDimensions = (product as { dimensions?: { length: number; width: number; height: number } }).dimensions || {
            length: 10,
            width: 8,
            height: 2
          };
          totalDimensions.length += itemDimensions.length * item.qty;
          totalDimensions.width += itemDimensions.width * item.qty;
          totalDimensions.height += itemDimensions.height * item.qty;
        }
      }

      // Use calculated weight and dimensions from cart
      const finalWeight = totalWeight;
      const finalDimensions = totalDimensions;

      // Calculate real USPS rates
      const uspsRates = await this.calculateUSPSRatesFromCart(cartItems, destination, finalWeight, finalDimensions);

      // Mock rates for other carriers (to be replaced with real APIs)
      const otherCarrierRates: ShippingRate[] = [
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

      // Combine USPS rates with other carrier rates
      const rates: ShippingRate[] = [...uspsRates, ...otherCarrierRates];

      // Filter rates based on destination, weight, and dimensions
      const filteredRates = rates.filter(() => {
        // Add business logic for rate filtering
        return true;
      });

      return filteredRates;
    } catch (error) {
      logger.error(`Error calculating shipping rates from cart: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Calculate shipping rates for an order (kept for backward compatibility)
   */
  static async calculateShippingRates(
    orderId: number,
    _destination: { country: string; zip: string },
    _weight: number,
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

      // Calculate real USPS rates
      const uspsRates = await this.calculateUSPSRates(order, _destination, _weight, _dimensions);

      // Mock rates for other carriers (to be replaced with real APIs)
      const otherCarrierRates: ShippingRate[] = [
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

      // Combine USPS rates with other carrier rates
      const rates: ShippingRate[] = [...uspsRates, ...otherCarrierRates];

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
   * Calculate USPS shipping rates from cart data
   */
  private static async calculateUSPSRatesFromCart(
    _cartItems: unknown[],
    destination: { country: string; zip: string },
    weight: number,
    dimensions?: { length: number; width: number; height: number }
  ): Promise<ShippingRate[]> {
    try {
      // Default origin ZIP (should be configurable)
      const originZip = process.env.USPS_ORIGIN_ZIP || "10001";

      // Only calculate USPS rates for US destinations
      if (destination.country !== "US" && destination.country !== "USA") {
        return [];
      }

      // Convert weight to ounces if needed
      const weightInOunces = weight < 10 ? weight * 16 : weight;

      // Get USPS rates
      const uspsRates = await USPSService.calculateRates({
        originZip,
        destinationZip: destination.zip,
        weight: weightInOunces,
        dimensions
      });

      // Convert USPS rates to ShippingRate format
      return uspsRates.map((rate) => ({
        carrier: "USPS" as Carrier,
        service: rate.service,
        cost: rate.cost,
        estimatedDays: rate.estimatedDays,
        trackingAvailable: rate.trackingAvailable
      }));
    } catch (error) {
      logger.error(`Error calculating USPS rates from cart: ${String(error)}`);
      // Return empty array on error to not break the flow
      return [];
    }
  }

  /**
   * Calculate USPS shipping rates
   */
  private static async calculateUSPSRates(
    _order: unknown,
    destination: { country: string; zip: string },
    weight: number,
    dimensions?: { length: number; width: number; height: number }
  ): Promise<ShippingRate[]> {
    try {
      // Default origin ZIP (should be configurable)
      const originZip = process.env.USPS_ORIGIN_ZIP || "10001";

      // Only calculate USPS rates for US destinations
      if (destination.country !== "US" && destination.country !== "USA") {
        return [];
      }

      // Convert weight to ounces if needed
      const weightInOunces = weight < 10 ? weight * 16 : weight;

      // Get USPS rates
      const uspsRates = await USPSService.calculateRates({
        originZip,
        destinationZip: destination.zip,
        weight: weightInOunces,
        dimensions
      });

      // Convert USPS rates to ShippingRate format
      return uspsRates.map((rate) => ({
        carrier: "USPS" as Carrier,
        service: rate.service,
        cost: rate.cost,
        estimatedDays: rate.estimatedDays,
        trackingAvailable: rate.trackingAvailable
      }));
    } catch (error) {
      logger.error(`Error calculating USPS rates: ${String(error)}`);
      // Return empty array on error to not break the flow
      return [];
    }
  }

  /**
   * Get product weight from database by category and productId
   */
  private static async getProductWeight(productId: number, category: string): Promise<number> {
    try {
      type ProductWithWeight = { weight?: number | null };
      let product: ProductWithWeight | null = null;

      switch (category) {
        case "ACCESSORIES":
          product = await db.accessories.findUnique({ where: { id: productId } });
          break;
        case "DECORATION":
          product = await db.decoration.findUnique({ where: { id: productId } });
          break;
        case "FASHION":
          product = await db.fashion.findUnique({ where: { id: productId } });
          break;
        case "HOME_LIVING":
          product = await db.homeAndLiving.findUnique({ where: { id: productId } });
          break;
        case "MEDITATION":
          product = await db.meditation.findUnique({ where: { id: productId } });
          break;
        case "MUSIC": {
          const musicProduct = await db.music.findUnique({ where: { id: productId } });
          product = musicProduct as ProductWithWeight | null;
          break;
        }
        case "DIGITAL_BOOK": {
          const bookProduct = await db.digitalBook.findUnique({ where: { id: productId } });
          product = bookProduct as ProductWithWeight | null;
          break;
        }
      }

      return product?.weight ?? 0;
    } catch (error) {
      logger.error(`Error fetching product weight for ${category} ID ${productId}:`, error);
      return 0;
    }
  }

  /**
   * Calculate total weight for order items
   */
  private static async calculateItemsWeight(items: Array<{ category: string; productId: number; quantity: number }>): Promise<number> {
    let totalWeight = 0;
    for (const item of items) {
      const productWeight = await this.getProductWeight(item.productId, item.category);
      totalWeight += productWeight * item.quantity;
    }
    return totalWeight;
  }

  /**
   * Generate USPS shipping label - Per-Vendor Labeling
   *
   * Always generates label for the specified vendorId only (authenticated vendor)
   * If vendorId is provided: Generates label for that vendor's items only
   * If vendorId is NOT provided: Should not happen (controller ensures vendorId is always provided)
   */
  static async generateUSPSLabel(params: {
    orderId: number;
    weight?: number; // Optional: If provided, used for single vendor. If not, calculated per vendor
    dimensions?: { length: number; width: number; height: number };
    serviceType?: string;
    vendorId: string; // Required: Always generate label for this vendor only
  }): Promise<{ success: boolean; label: unknown; message: string }> {
    try {
      const { orderId, weight, dimensions, serviceType, vendorId } = params;

      if (!vendorId) {
        return { success: false, label: null, message: "Vendor ID is required" };
      }

      // Fetch order with items and user information
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
              country: true
            }
          },
          items: {
            select: {
              id: true,
              category: true,
              productId: true,
              vendorId: true,
              quantity: true,
              status: true
            }
          }
        }
      });

      if (!order) {
        return { success: false, label: null, message: "Order not found" };
      }

      if (order.items.length === 0) {
        return { success: false, label: null, message: "Order has no items" };
      }

      // Validate order shipping address
      if (!order.shippingAddress || !order.zip) {
        return { success: false, label: null, message: "Order shipping address is incomplete" };
      }

      // Group items by vendor
      const itemsByVendor = new Map<string, typeof order.items>();
      for (const item of order.items) {
        if (!itemsByVendor.has(item.vendorId)) {
          itemsByVendor.set(item.vendorId, []);
        }
        itemsByVendor.get(item.vendorId)!.push(item);
      }

      // Always generate label for the specified vendor only (authenticated vendor)
      if (!itemsByVendor.has(vendorId)) {
        return {
          success: false,
          label: null,
          message: `Vendor ${vendorId} has no items in this order`
        };
      }

      const vendorsToProcess = [vendorId];

      const generatedLabels: Array<{
        vendorId: string;
        vendorName: string;
        items: Array<{ id: number; category: string; productId: number; quantity: number }>;
        shipmentId: number;
        trackingNumber: string;
        labelUrl: string;
        trackingUrl: string;
        cost: number;
        service: string;
        fromAddress: USPSAddress;
        toAddress: USPSAddress;
      }> = [];

      const errors: Array<{ vendorId: string; vendorName: string; error: string }> = [];

      // Process each vendor
      for (const targetVendorId of vendorsToProcess) {
        try {
          const vendorItems = itemsByVendor.get(targetVendorId)!;

          // Fetch vendor information
          const vendor = await db.user.findUnique({
            where: { id: targetVendorId },
            select: {
              id: true,
              fullName: true,
              businessName: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
              country: true
            }
          });

          if (!vendor) {
            errors.push({
              vendorId: targetVendorId,
              vendorName: "Unknown Vendor",
              error: "Vendor not found"
            });
            continue;
          }

          // Validate vendor address
          const missingFields: string[] = [];
          if (!vendor.address) missingFields.push("address");
          if (!vendor.city) missingFields.push("city");
          if (!vendor.state) missingFields.push("state");
          if (!vendor.zipCode) missingFields.push("zipCode");

          if (missingFields.length > 0) {
            errors.push({
              vendorId: targetVendorId,
              vendorName: vendor.businessName || vendor.fullName || "Unknown Vendor",
              error: `Vendor address is incomplete. Missing fields: ${missingFields.join(", ")}`
            });
            continue;
          }

          // Calculate weight for this vendor's items
          const vendorWeight = weight || (await this.calculateItemsWeight(vendorItems));

          // Create USPS addresses
          const fromAddress: USPSAddress = {
            name: vendor.businessName || vendor.fullName,
            address1: vendor.address || "",
            city: vendor.city || "",
            state: vendor.state || "",
            zip: vendor.zipCode || "",
            country: vendor.country || "US" // Default to US if not specified
          };

          const toAddress: USPSAddress = {
            name: order.fullName,
            address1: order.shippingAddress || "",
            city: order.user.city || "",
            state: order.user.state || "",
            zip: order.zip || "",
            country: order.user.country || "US" // Default to US if not specified
          };

          // Generate USPS label
          const uspsLabel = await USPSService.generateLabel({
            fromAddress,
            toAddress,
            weight: vendorWeight,
            dimensions,
            serviceType
          });

          if (!uspsLabel) {
            errors.push({
              vendorId: targetVendorId,
              vendorName: vendor.businessName || vendor.fullName || "Unknown Vendor",
              error: "Failed to generate USPS label"
            });
            continue;
          }

          // Create shipment record
          const shipment = await db.shipment.create({
            data: {
              orderId,
              vendorId: targetVendorId,
              trackingNumber: uspsLabel.trackingNumber,
              carrier: "USPS",
              shippingMethod: "STANDARD",
              weight: vendorWeight,
              dimensions: dimensions ? JSON.stringify(dimensions) : null,
              cost: uspsLabel.cost,
              labelUrl: uspsLabel.labelUrl,
              trackingUrl: uspsLabel.trackingUrl,
              status: "LABEL_CREATED"
            } as Prisma.ShipmentUncheckedCreateInput
          });

          // Update order items status for this vendor
          await db.orderItem.updateMany({
            where: {
              orderId,
              vendorId: targetVendorId,
              status: { not: "CANCELLED" }
            },
            data: {
              status: "SHIPPED",
              trackingNumber: uspsLabel.trackingNumber,
              shippedAt: new Date()
            }
          });

          // Create order history entry
          await db.orderHistory.create({
            data: {
              orderId,
              status: "SHIPPED",
              previousStatus: order.status,
              changedBy: "system",
              reason: "USPS label generated",
              notes: `USPS ${uspsLabel.service} label generated for vendor ${vendor.businessName || vendor.fullName} - ${uspsLabel.trackingNumber}`
            }
          });

          generatedLabels.push({
            vendorId: targetVendorId,
            vendorName: vendor.businessName || vendor.fullName,
            items: vendorItems.map((item) => ({
              id: item.id,
              category: item.category,
              productId: item.productId,
              quantity: item.quantity
            })),
            shipmentId: shipment.id,
            trackingNumber: uspsLabel.trackingNumber,
            labelUrl: uspsLabel.labelUrl || "",
            trackingUrl: uspsLabel.trackingUrl || "",
            cost: uspsLabel.cost,
            service: uspsLabel.service,
            fromAddress,
            toAddress
          });

          logger.info(`USPS label generated for order ${orderId}, vendor ${targetVendorId}: ${uspsLabel.trackingNumber}`);
        } catch (error) {
          logger.error(`Error generating label for vendor ${targetVendorId}:`, error);
          errors.push({
            vendorId: targetVendorId,
            vendorName: "Unknown Vendor",
            error: `Failed to generate label: ${String(error)}`
          });
        }
      }

      // If no labels were generated, return error
      if (generatedLabels.length === 0) {
        return {
          success: false,
          label: null,
          message: errors.length > 0 ? errors.map((e) => `${e.vendorName}: ${e.error}`).join("; ") : "Failed to generate any labels"
        };
      }

      // Check if all items are shipped (fetch fresh status from database)
      const orderItemsWithStatus = await db.orderItem.findMany({
        where: { orderId },
        select: { id: true, status: true }
      });

      const allItemsShipped = orderItemsWithStatus.every((item) => item.status === "SHIPPED" || item.status === "CANCELLED");

      if (allItemsShipped) {
        await db.order.update({
          where: { id: orderId },
          data: {
            status: "SHIPPED",
            shippingStatus: "LABEL_CREATED"
          }
        });
      } else {
        // Update order to reflect partial shipment
        await db.order.update({
          where: { id: orderId },
          data: {
            shippingStatus: "LABEL_CREATED"
          }
        });
      }

      // Return response - always single label format (authenticated vendor only)
      if (generatedLabels.length === 0) {
        return {
          success: false,
          label: null,
          message: errors.length > 0 ? errors[0]?.error || "Failed to generate label" : "Failed to generate label"
        };
      }

      // Always return single label format (we only process one vendor)
      return {
        success: true,
        label: generatedLabels[0],
        message: "USPS label generated successfully"
      };
    } catch (error) {
      logger.error(`Error generating USPS label: ${String(error)}`);
      return { success: false, label: null, message: "Failed to generate USPS label" };
    }
  }

  /**
   * Validate USPS address
   */
  static async validateUSPSAddress(address: USPSAddress): Promise<{ success: boolean; validatedAddress: unknown; message: string }> {
    try {
      const validatedAddress = await USPSService.validateAddress(address);

      if (!validatedAddress) {
        return { success: false, validatedAddress: null, message: "Address validation failed" };
      }

      return {
        success: true,
        validatedAddress,
        message: "Address validated successfully"
      };
    } catch (error) {
      logger.error(`Error validating USPS address: ${String(error)}`);
      return { success: false, validatedAddress: null, message: "Address validation failed" };
    }
  }

  /**
   * Track USPS package
   */
  static async trackUSPSPackage(trackingNumber: string): Promise<{ success: boolean; tracking: unknown; message: string }> {
    try {
      const trackingInfo = await USPSService.trackPackage(trackingNumber);

      if (!trackingInfo) {
        return { success: false, tracking: null, message: "Tracking information not found" };
      }

      return {
        success: true,
        tracking: trackingInfo,
        message: "Tracking information retrieved successfully"
      };
    } catch (error) {
      logger.error(`Error tracking USPS package: ${String(error)}`);
      return { success: false, tracking: null, message: "Failed to retrieve tracking information" };
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
   * Get all shipments for an order
   */
  static async getOrderShipments(orderId: number): Promise<{ success: boolean; shipments: unknown; message: string }> {
    try {
      // Use raw query or fetch without vendor relation for now
      const shipments = await db.shipment.findMany({
        where: { orderId },
        orderBy: {
          createdAt: "desc"
        }
      });

      // Type for shipment with vendorId (extends Prisma Shipment type)
      type ShipmentWithVendorId = (typeof shipments)[0] & { vendorId?: string | null };

      // Fetch vendor details separately if vendorId exists
      const shipmentsWithVendor = await Promise.all(
        shipments.map(
          async (
            shipment
          ): Promise<{
            id: number;
            orderId: number;
            vendorId: string | null;
            trackingNumber: string;
            carrier: string;
            shippingMethod: string;
            status: string;
            labelUrl: string | null;
            trackingUrl: string | null;
            estimatedDelivery: Date | null;
            actualDelivery: Date | null;
            weight: number | null;
            dimensions: string | null;
            cost: number;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            vendor: { id: string; fullName: string; businessName: string | null; email: string } | null;
          }> => {
            let vendor: { id: string; fullName: string; businessName: string | null; email: string } | null = null;

            // Type assertion for vendorId (exists in database but not in Prisma types yet)
            const shipmentWithVendorId = shipment as ShipmentWithVendorId;
            const vendorId = shipmentWithVendorId.vendorId;

            if (vendorId && typeof vendorId === "string") {
              const vendorData = await db.user.findUnique({
                where: { id: vendorId },
                select: {
                  id: true,
                  fullName: true,
                  businessName: true,
                  email: true
                }
              });

              if (vendorData) {
                vendor = vendorData;
              }
            }

            return {
              id: shipment.id,
              orderId: shipment.orderId,
              vendorId: vendorId && typeof vendorId === "string" ? vendorId : null,
              trackingNumber: shipment.trackingNumber,
              carrier: shipment.carrier,
              shippingMethod: shipment.shippingMethod,
              status: shipment.status,
              labelUrl: shipment.labelUrl,
              trackingUrl: shipment.trackingUrl,
              estimatedDelivery: shipment.estimatedDelivery,
              actualDelivery: shipment.actualDelivery,
              weight: shipment.weight,
              dimensions: shipment.dimensions,
              cost: shipment.cost,
              notes: shipment.notes,
              createdAt: shipment.createdAt,
              updatedAt: shipment.updatedAt,
              vendor
            };
          }
        )
      );

      return {
        success: true,
        shipments: shipmentsWithVendor,
        message: shipments.length > 0 ? `Found ${shipments.length} shipment(s)` : "No shipments found for this order"
      };
    } catch (error) {
      logger.error(`Error fetching order shipments: ${String(error)}`);
      return { success: false, shipments: [], message: "Failed to fetch order shipments" };
    }
  }

  /**
   * Get shipment tracking information
   */
  static async getShipmentTracking(trackingNumber: string): Promise<unknown> {
    try {
      const shipment = await db.shipment.findFirst({
        where: { trackingNumber },
        select: {
          id: true,
          orderId: true,
          trackingNumber: true,
          carrier: true,
          shippingMethod: true,
          status: true,
          labelUrl: true,
          trackingUrl: true,
          estimatedDelivery: true,
          actualDelivery: true,
          weight: true,
          dimensions: true,
          cost: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          order: {
            select: {
              id: true,
              userId: true,
              amount: true,
              status: true,
              paymentStatus: true,
              fullName: true,
              shippingAddress: true,
              zip: true,
              phone: true,
              country: true,
              trackingNumber: true,
              carrier: true,
              shippingCost: true,
              estimatedDelivery: true,
              actualDelivery: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              },
              items: {
                select: {
                  id: true,
                  orderId: true,
                  category: true,
                  productId: true,
                  vendorId: true,
                  quantity: true,
                  price: true,
                  status: true,
                  trackingNumber: true,
                  shippedAt: true,
                  deliveredAt: true,
                  createdAt: true,
                  updatedAt: true
                }
              }
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
        // Filter by vendorId directly - no need for product relations
        where.order = {
          items: {
            some: {
              vendorId: vendorId
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
