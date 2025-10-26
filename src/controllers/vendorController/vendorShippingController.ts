import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

const vendorShippingController = {
  /**
   * Create or update vendor shipping configuration
   */
  createOrUpdateShippingConfig: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const { defaultCarrier, defaultMethod, handlingFee, freeShippingThreshold, isConfigured } = req.body as {
      defaultCarrier?: string;
      defaultMethod?: string;
      handlingFee?: number;
      freeShippingThreshold?: number;
      isConfigured?: boolean;
    };

    try {
      // Check if vendor exists and has vendor role
      const vendor = await db.user.findFirst({
        where: { id: vendorId, role: "vendor" }
      });

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      // Create or update shipping configuration
      const shippingConfig = await (db as any).vendorShippingConfig.upsert({
        where: { vendorId },
        update: {
          defaultCarrier,
          defaultMethod,
          handlingFee,
          freeShippingThreshold,
          isConfigured: isConfigured ?? true,
          updatedAt: new Date()
        },
        create: {
          vendorId,
          defaultCarrier,
          defaultMethod,
          handlingFee,
          freeShippingThreshold,
          isConfigured: isConfigured ?? true
        }
      });

      // Update vendor's shipping config completion status
      await db.user.update({
        where: { id: vendorId },
        data: { shippingConfigCompleted: true }
      });

      logger.info(`Shipping configuration ${shippingConfig.id ? "updated" : "created"} for vendor ${vendorId}`);

      return httpResponse(req, res, reshttp.okCode, "Shipping configuration updated successfully", {
        id: shippingConfig.id,
        vendorId,
        isConfigured: shippingConfig.isConfigured,
        defaultCarrier: shippingConfig.defaultCarrier,
        defaultMethod: shippingConfig.defaultMethod,
        handlingFee: shippingConfig.handlingFee,
        freeShippingThreshold: shippingConfig.freeShippingThreshold,
        createdAt: shippingConfig.createdAt,
        updatedAt: shippingConfig.updatedAt
      });
    } catch (error) {
      logger.error("Error creating/updating shipping configuration:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update shipping configuration");
    }
  }),

  /**
   * Get vendor shipping configuration
   */
  getShippingConfig: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;

    try {
      // Get shipping configuration
      const shippingConfig = await (db as any).vendorShippingConfig.findUnique({
        where: { vendorId },
        include: {
          zones: {
            include: {
              rates: true
            }
          }
        }
      });

      if (!shippingConfig) {
        return httpResponse(req, res, reshttp.notFoundCode, "Shipping configuration not found");
      }

      return httpResponse(req, res, reshttp.okCode, "Shipping configuration retrieved successfully", {
        id: shippingConfig.id,
        vendorId: shippingConfig.vendorId,
        isConfigured: shippingConfig.isConfigured,
        defaultCarrier: shippingConfig.defaultCarrier,
        defaultMethod: shippingConfig.defaultMethod,
        handlingFee: shippingConfig.handlingFee,
        freeShippingThreshold: shippingConfig.freeShippingThreshold,
        zones: shippingConfig.zones,
        createdAt: shippingConfig.createdAt,
        updatedAt: shippingConfig.updatedAt
      });
    } catch (error) {
      logger.error("Error retrieving shipping configuration:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to retrieve shipping configuration");
    }
  }),

  /**
   * Update shipping configuration status
   */
  updateShippingConfigStatus: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const { isConfigured } = req.body as {
      isConfigured?: boolean;
    };

    try {
      const shippingConfig = await (db as any).vendorShippingConfig.update({
        where: { vendorId },
        data: {
          isConfigured,
          updatedAt: new Date()
        }
      });

      return httpResponse(req, res, reshttp.okCode, "Shipping configuration status updated successfully", {
        id: shippingConfig.id,
        isConfigured: shippingConfig.isConfigured,
        updatedAt: shippingConfig.updatedAt
      });
    } catch (error) {
      logger.error("Error updating shipping configuration status:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update shipping configuration status");
    }
  }),

  /**
   * Create shipping zone
   */
  createShippingZone: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const {
      zoneName,
      country,
      state,
      zipCodeRanges,
      isActive = true,
      description
    } = req.body as {
      zoneName: string;
      country: string;
      state?: string;
      zipCodeRanges: Array<{ from: string; to: string }>;
      isActive?: boolean;
      description?: string;
    };

    try {
      // Check if vendor exists
      const vendor = await db.user.findFirst({
        where: { id: vendorId, role: "vendor" }
      });

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      const shippingZone = await (db as any).vendorShippingZone.create({
        data: {
          vendorId,
          zoneName,
          country,
          state,
          zipCodeRanges,
          isActive,
          description
        }
      });

      logger.info(`Shipping zone created: ${shippingZone.id} for vendor ${vendorId}`);

      return httpResponse(req, res, reshttp.createdCode, "Shipping zone created successfully", {
        id: shippingZone.id,
        vendorId: shippingZone.vendorId,
        zoneName: shippingZone.zoneName,
        country: shippingZone.country,
        state: shippingZone.state,
        zipCodeRanges: shippingZone.zipCodeRanges,
        isActive: shippingZone.isActive,
        description: shippingZone.description,
        createdAt: shippingZone.createdAt
      });
    } catch (error) {
      logger.error("Error creating shipping zone:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create shipping zone");
    }
  }),

  /**
   * Update shipping zone
   */
  updateShippingZone: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const { zoneId } = req.params;
    const { zoneName, country, state, zipCodeRanges, isActive, description } = req.body as {
      zoneName?: string;
      country?: string;
      state?: string;
      zipCodeRanges?: Array<{ from: string; to: string }>;
      isActive?: boolean;
      description?: string;
    };

    try {
      // Verify zone belongs to vendor
      const existingZone = await (db as any).vendorShippingZone.findFirst({
        where: { id: zoneId, vendorId }
      });

      if (!existingZone) {
        return httpResponse(req, res, reshttp.notFoundCode, "Shipping zone not found");
      }

      const updatedZone = await (db as any).vendorShippingZone.update({
        where: { id: zoneId },
        data: {
          zoneName,
          country,
          state,
          zipCodeRanges,
          isActive,
          description,
          updatedAt: new Date()
        }
      });

      return httpResponse(req, res, reshttp.okCode, "Shipping zone updated successfully", {
        id: updatedZone.id,
        zoneName: updatedZone.zoneName,
        country: updatedZone.country,
        state: updatedZone.state,
        zipCodeRanges: updatedZone.zipCodeRanges,
        isActive: updatedZone.isActive,
        description: updatedZone.description,
        updatedAt: updatedZone.updatedAt
      });
    } catch (error) {
      logger.error("Error updating shipping zone:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update shipping zone");
    }
  }),

  /**
   * Delete shipping zone
   */
  deleteShippingZone: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const { zoneId } = req.params;

    try {
      // Verify zone belongs to vendor
      const existingZone = await (db as any).vendorShippingZone.findFirst({
        where: { id: zoneId, vendorId }
      });

      if (!existingZone) {
        return httpResponse(req, res, reshttp.notFoundCode, "Shipping zone not found");
      }

      // Delete associated rates first
      await (db as any).vendorShippingRate.deleteMany({
        where: { zoneId }
      });

      // Delete the zone
      await (db as any).vendorShippingZone.delete({
        where: { id: zoneId }
      });

      logger.info(`Shipping zone deleted: ${zoneId} for vendor ${vendorId}`);

      return httpResponse(req, res, reshttp.okCode, "Shipping zone deleted successfully");
    } catch (error) {
      logger.error("Error deleting shipping zone:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to delete shipping zone");
    }
  }),

  /**
   * Create shipping zone with rates in one call
   */
  createZoneWithRates: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const {
      zoneName,
      country,
      state,
      zipCodeRanges,
      isActive = true,
      description,
      shippingRates
    } = req.body as {
      zoneName: string;
      country: string;
      state?: string;
      zipCodeRanges: Array<{ from: string; to: string }>;
      isActive?: boolean;
      description?: string;
      shippingRates: Array<{
        carrier: string;
        method: string;
        rateType: string;
        baseRate?: number;
        perKgRate?: number;
        perItemRate?: number;
        freeShippingThreshold?: number;
        maxWeight?: number;
        estimatedDays?: number;
        isActive?: boolean;
        description?: string;
      }>;
    };

    try {
      // Check if vendor exists
      const vendor = await db.user.findFirst({
        where: { id: vendorId, role: "vendor" }
      });

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      // Create shipping zone
      const shippingZone = await (db as any).vendorShippingZone.create({
        data: {
          vendorId,
          zoneName,
          country,
          state,
          zipCodeRanges,
          isActive,
          description
        }
      });

      // Create shipping rates for the zone
      const createdRates = [];
      for (const rate of shippingRates) {
        const shippingRate = await (db as any).vendorShippingRate.create({
          data: {
            zoneId: shippingZone.id,
            carrier: rate.carrier,
            method: rate.method,
            rateType: rate.rateType,
            baseRate: rate.baseRate,
            perKgRate: rate.perKgRate,
            perItemRate: rate.perItemRate,
            freeShippingThreshold: rate.freeShippingThreshold,
            maxWeight: rate.maxWeight,
            estimatedDays: rate.estimatedDays,
            isActive: rate.isActive ?? true,
            description: rate.description
          }
        });
        createdRates.push(shippingRate);
      }

      logger.info(`Shipping zone with rates created: ${shippingZone.id} for vendor ${vendorId}`);

      return httpResponse(req, res, reshttp.createdCode, "Shipping zone with rates created successfully", {
        zone: {
          id: shippingZone.id,
          vendorId: shippingZone.vendorId,
          zoneName: shippingZone.zoneName,
          country: shippingZone.country,
          state: shippingZone.state,
          zipCodeRanges: shippingZone.zipCodeRanges,
          isActive: shippingZone.isActive,
          description: shippingZone.description,
          createdAt: shippingZone.createdAt
        },
        rates: createdRates,
        totalRates: createdRates.length
      });
    } catch (error) {
      logger.error("Error creating shipping zone with rates:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create shipping zone with rates");
    }
  }),

  /**
   * Create shipping rate
   */
  createShippingRate: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const {
      zoneId,
      carrier,
      method,
      rateType,
      baseRate,
      perKgRate,
      perItemRate,
      freeShippingThreshold,
      maxWeight,
      estimatedDays,
      isActive = true,
      description
    } = req.body as {
      zoneId: string;
      carrier: string;
      method: string;
      rateType: string;
      baseRate?: number;
      perKgRate?: number;
      perItemRate?: number;
      freeShippingThreshold?: number;
      maxWeight?: number;
      estimatedDays?: number;
      isActive?: boolean;
      description?: string;
    };

    try {
      // Verify zone belongs to vendor
      const zone = await (db as any).vendorShippingZone.findFirst({
        where: { id: zoneId, vendorId }
      });

      if (!zone) {
        return httpResponse(req, res, reshttp.notFoundCode, "Shipping zone not found");
      }

      const shippingRate = await (db as any).vendorShippingRate.create({
        data: {
          zoneId,
          carrier,
          method,
          rateType,
          baseRate,
          perKgRate,
          perItemRate,
          freeShippingThreshold,
          maxWeight,
          estimatedDays,
          isActive,
          description
        }
      });

      logger.info(`Shipping rate created: ${shippingRate.id} for zone ${zoneId}`);

      return httpResponse(req, res, reshttp.createdCode, "Shipping rate created successfully", {
        id: shippingRate.id,
        zoneId: shippingRate.zoneId,
        carrier: shippingRate.carrier,
        method: shippingRate.method,
        rateType: shippingRate.rateType,
        baseRate: shippingRate.baseRate,
        perKgRate: shippingRate.perKgRate,
        perItemRate: shippingRate.perItemRate,
        freeShippingThreshold: shippingRate.freeShippingThreshold,
        maxWeight: shippingRate.maxWeight,
        estimatedDays: shippingRate.estimatedDays,
        isActive: shippingRate.isActive,
        description: shippingRate.description,
        createdAt: shippingRate.createdAt
      });
    } catch (error) {
      logger.error("Error creating shipping rate:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create shipping rate");
    }
  }),

  /**
   * Update shipping rate
   */
  updateShippingRate: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const { rateId } = req.params;
    const updateData = req.body as {
      carrier?: string;
      method?: string;
      rateType?: string;
      baseRate?: number;
      perKgRate?: number;
      perItemRate?: number;
      freeShippingThreshold?: number;
      maxWeight?: number;
      estimatedDays?: number;
      isActive?: boolean;
      description?: string;
    };

    try {
      // Verify rate belongs to vendor through zone
      const existingRate = await (db as any).vendorShippingRate.findFirst({
        where: {
          id: rateId,
          zone: {
            vendorId
          }
        },
        include: {
          zone: true
        }
      });

      if (!existingRate) {
        return httpResponse(req, res, reshttp.notFoundCode, "Shipping rate not found");
      }

      const updatedRate = await (db as any).vendorShippingRate.update({
        where: { id: rateId },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });

      return httpResponse(req, res, reshttp.okCode, "Shipping rate updated successfully", {
        id: updatedRate.id,
        zoneId: updatedRate.zoneId,
        carrier: updatedRate.carrier,
        method: updatedRate.method,
        rateType: updatedRate.rateType,
        baseRate: updatedRate.baseRate,
        perKgRate: updatedRate.perKgRate,
        perItemRate: updatedRate.perItemRate,
        freeShippingThreshold: updatedRate.freeShippingThreshold,
        maxWeight: updatedRate.maxWeight,
        estimatedDays: updatedRate.estimatedDays,
        isActive: updatedRate.isActive,
        description: updatedRate.description,
        updatedAt: updatedRate.updatedAt
      });
    } catch (error) {
      logger.error("Error updating shipping rate:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update shipping rate");
    }
  }),

  /**
   * Delete shipping rate
   */
  deleteShippingRate: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const { rateId } = req.params;

    try {
      // Verify rate belongs to vendor through zone
      const existingRate = await (db as any).vendorShippingRate.findFirst({
        where: {
          id: rateId,
          zone: {
            vendorId
          }
        }
      });

      if (!existingRate) {
        return httpResponse(req, res, reshttp.notFoundCode, "Shipping rate not found");
      }

      await (db as any).vendorShippingRate.delete({
        where: { id: rateId }
      });

      logger.info(`Shipping rate deleted: ${rateId} for vendor ${vendorId}`);

      return httpResponse(req, res, reshttp.okCode, "Shipping rate deleted successfully");
    } catch (error) {
      logger.error("Error deleting shipping rate:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to delete shipping rate");
    }
  }),

  /**
   * Calculate shipping rates for an order
   */
  calculateShippingRates: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;

    const { destination, items } = req.body as {
      destination: {
        country: string;
        state?: string;
        zipCode: string;
        city?: string;
      };
      items: Array<{
        productId: string;
        category: string;
        weight: number;
        quantity: number;
        price: number;
      }>;
    };

    try {
      // Import and use shipping calculation service
      const shippingService = await import("../../services/shippingCalculationService.js");
      const rates = await shippingService.default.calculateShippingRates({
        vendorId: vendorId || "",
        destination,
        items: items.map((item) => ({
          productId: parseInt(item.productId) || 0,
          category: item.category,
          quantity: item.quantity,
          weight: item.weight,
          dimensions: undefined
        }))
      });

      return httpResponse(req, res, reshttp.okCode, "Shipping rates calculated successfully", rates);
    } catch (error) {
      logger.error("Error calculating shipping rates:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to calculate shipping rates");
    }
  }),

  /**
   * Validate shipping configuration
   */
  validateShippingConfig: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;

    try {
      // Get shipping configuration
      const shippingConfig = await (db as any).vendorShippingConfig.findUnique({
        where: { vendorId },
        include: {
          zones: {
            include: {
              rates: true
            }
          }
        }
      });

      if (!shippingConfig) {
        return httpResponse(req, res, reshttp.notFoundCode, "Shipping configuration not found");
      }

      const zones = shippingConfig.zones || [];
      const allRates = zones.flatMap((zone: any) => zone.rates || []);

      const missingRequirements = [];
      const warnings = [];

      // Check for required configurations
      if (zones.length === 0) {
        missingRequirements.push("At least one shipping zone is required");
      }

      if (allRates.length === 0) {
        missingRequirements.push("At least one shipping rate is required");
      }

      // Check for zones without rates
      zones.forEach((zone: any) => {
        if (!zone.rates || zone.rates.length === 0) {
          warnings.push(`Zone "${zone.zoneName}" has no shipping rates`);
        }
      });

      // Check for inactive zones
      const inactiveZones = zones.filter((zone: any) => !zone.isActive);
      if (inactiveZones.length > 0) {
        warnings.push(`${inactiveZones.length} zone(s) are inactive`);
      }

      const isValid = missingRequirements.length === 0;
      const isComplete = isValid && warnings.length === 0;

      return httpResponse(req, res, reshttp.okCode, "Shipping configuration validation completed", {
        isValid,
        isComplete,
        missingRequirements,
        warnings,
        summary: {
          totalZones: zones.length,
          totalRates: allRates.length,
          coveragePercentage:
            zones.length > 0 ? Math.round((zones.filter((z: any) => z.rates && z.rates.length > 0).length / zones.length) * 100) : 0,
          estimatedSetupTime: zones.length > 0 ? "15 minutes" : "30 minutes"
        }
      });
    } catch (error) {
      logger.error("Error validating shipping configuration:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to validate shipping configuration");
    }
  }),

  /**
   * Get shipping configuration summary
   */
  getShippingConfigSummary: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;

    try {
      const shippingConfig = await (db as any).vendorShippingConfig.findUnique({
        where: { vendorId },
        include: {
          zones: {
            include: {
              rates: true
            }
          }
        }
      });

      if (!shippingConfig) {
        return httpResponse(req, res, reshttp.notFoundCode, "Shipping configuration not found");
      }

      const zones = shippingConfig.zones || [];
      const allRates = zones.flatMap((zone: any) => zone.rates || []);

      return httpResponse(req, res, reshttp.okCode, "Shipping configuration summary retrieved successfully", {
        vendorId,
        isConfigured: shippingConfig.isConfigured,
        defaultCarrier: shippingConfig.defaultCarrier,
        defaultMethod: shippingConfig.defaultMethod,
        handlingFee: shippingConfig.handlingFee,
        freeShippingThreshold: shippingConfig.freeShippingThreshold,
        zones: {
          total: zones.length,
          active: zones.filter((z: any) => z.isActive).length,
          inactive: zones.filter((z: any) => !z.isActive).length
        },
        rates: {
          total: allRates.length,
          active: allRates.filter((r: any) => r.isActive).length,
          inactive: allRates.filter((r: any) => !r.isActive).length
        },
        carriers: [...new Set(allRates.map((r: any) => r.carrier))],
        methods: [...new Set(allRates.map((r: any) => r.method))],
        createdAt: shippingConfig.createdAt,
        updatedAt: shippingConfig.updatedAt
      });
    } catch (error) {
      logger.error("Error retrieving shipping configuration summary:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to retrieve shipping configuration summary");
    }
  })
};

export default vendorShippingController;
