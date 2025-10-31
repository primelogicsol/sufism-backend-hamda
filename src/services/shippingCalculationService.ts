import { db } from "../configs/database.js";
import logger from "../utils/loggerUtils.js";

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */

export interface ShippingCalculationRequest {
  vendorId: string;
  items: Array<{
    productId: number;
    category: string;
    quantity: number;
    weight?: number;
    dimensions?: string;
  }>;
  destination: {
    country: string;
    state?: string;
    zipCode: string;
  };
}

export interface ShippingRate {
  id: number;
  carrier: string;
  method: string;
  cost: number;
  estimatedDays: number;
  serviceName: string;
  rateType: string;
}

export interface ShippingCalculationResponse {
  totalWeight: number;
  availableRates: ShippingRate[];
  freeShippingEligible: boolean;
  applicableZone?: {
    id: number;
    zoneName: string;
    country?: string;
    state?: string;
  };
}

class ShippingCalculationService {
  /**
   * Calculate shipping rates for a given request
   */
  async calculateShippingRates(request: ShippingCalculationRequest): Promise<ShippingCalculationResponse> {
    try {
      // Get vendor's shipping configuration
      const shippingConfig = await db.vendorShippingConfig.findUnique({
        where: { vendorId: request.vendorId },
        include: {
          shippingZones: {
            include: {
              shippingMethods: {
                where: { isActive: true }
              }
            },
            where: { isActive: true }
          }
        }
      });

      // Calculate total weight early so we can still respond even if config/zone is missing
      const totalWeight = await this.calculateTotalWeight(request.items);

      if (!shippingConfig) {
        // Return a graceful empty response instead of throwing
        return {
          totalWeight,
          availableRates: [],
          freeShippingEligible: false,
          applicableZone: {
            id: 0,
            zoneName: "NO_CONFIG",
            country: undefined,
            state: undefined
          }
        };
      }

      // Find applicable shipping zone
      const applicableZone = this.findApplicableZone(shippingConfig.shippingZones, request.destination);

      if (!applicableZone) {
        // Return graceful empty response if no zone matches
        return {
          totalWeight,
          availableRates: [],
          freeShippingEligible: false,
          applicableZone: {
            id: 0,
            zoneName: "NO_MATCHING_ZONE",
            country: undefined,
            state: undefined
          }
        };
      }

      // Calculate rates for each shipping method
      const availableRates = this.calculateRatesForZone(applicableZone as any, totalWeight, request.items);

      // Check for global free shipping threshold
      const freeShippingEligible = shippingConfig.freeShippingThreshold ? totalWeight >= shippingConfig.freeShippingThreshold : false;

      return {
        totalWeight,
        availableRates,
        freeShippingEligible,
        applicableZone: {
          id: applicableZone.id,
          zoneName: applicableZone.zoneName,
          country: applicableZone.country || undefined,
          state: applicableZone.state || undefined
        }
      };
    } catch (error) {
      logger.error("Error calculating shipping rates:", error);
      throw error;
    }
  }

  /**
   * Find applicable shipping zone based on destination
   */
  private findApplicableZone(
    zones: Array<{
      id: number;
      country?: string | null;
      state?: string | null;
      zipCodeRanges?: unknown;
      zoneName: string;
    }>,
    destination: {
      country: string;
      state?: string;
      zipCode: string;
    }
  ) {
    return zones.find((zone) => {
      // Check country match
      if (zone.country && zone.country !== destination.country) {
        return false;
      }

      // Check state match - only enforce if both zone and destination have state
      if (zone.state && destination.state && zone.state !== destination.state) {
        return false;
      }

      // Check zip code ranges if specified
      if (zone.zipCodeRanges) {
        let zipRanges: Array<{ from: string; to: string } | string> = [];
        if (typeof zone.zipCodeRanges === "string") {
          try {
            zipRanges = JSON.parse(zone.zipCodeRanges) as Array<{ from: string; to: string } | string>;
          } catch {
            zipRanges = [];
          }
        } else if (Array.isArray(zone.zipCodeRanges)) {
          zipRanges = zone.zipCodeRanges as Array<{ from: string; to: string } | string>;
        } else if (typeof zone.zipCodeRanges === "object") {
          // Some ORMs may return JSON fields as objects; attempt to coerce to expected array shape
          zipRanges = (zone.zipCodeRanges as unknown as Array<{ from: string; to: string } | string>) || [];
        }

        if (zipRanges.length > 0) {
          const zipCode = destination.zipCode;
          const isInRange = zipRanges.some((range) => {
            if (typeof range === "string") {
              return zipCode.startsWith(range);
            } else if (range && typeof range === "object" && (range as any).from && (range as any).to) {
              const from = (range as any).from as string;
              const to = (range as any).to as string;
              return zipCode >= from && zipCode <= to;
            }
            return false;
          });
          if (!isInRange) return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate total weight of items
   */
  private async calculateTotalWeight(
    items: Array<{
      productId: number;
      category: string;
      quantity: number;
      weight?: number;
    }>
  ): Promise<number> {
    let totalWeight = 0;

    for (const item of items) {
      if (item.weight) {
        totalWeight += item.weight * item.quantity;
      } else {
        // If weight not provided in request, fetch from database
        const productWeight = await this.getProductWeight(item.productId, item.category);
        totalWeight += productWeight * item.quantity;
      }
    }

    return totalWeight;
  }

  /**
   * Get product weight from database
   */
  private async getProductWeight(productId: number, category: string): Promise<number> {
    try {
      let product: { weight?: number | null } | null = null;

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
        case "MUSIC":
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          product = (await db.music.findUnique({ where: { id: productId } })) as any;
          break;
        case "DIGITAL_BOOK":
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          product = (await db.digitalBook.findUnique({ where: { id: productId } })) as any;
          break;
      }

      return (product as any)?.weight || 0;
    } catch (error) {
      logger.error(`Error fetching product weight for ${category} ID ${productId}:`, error);
      return 0;
    }
  }

  /**
   * Calculate rates for a specific zone
   */
  private calculateRatesForZone(
    zone: {
      shippingMethods: Array<{
        id: number;
        carrier: string;
        method: string;
        rateType: string;
        baseRate: number;
        perKgRate?: number | null;
        perItemRate?: number | null;
        freeShippingThreshold?: number | null;
        maxWeight?: number | null;
        estimatedDays: number;
      }>;
    },
    totalWeight: number,
    items: Array<{
      productId: number;
      category: string;
      quantity: number;
      weight?: number;
      price?: number;
    }>
  ): ShippingRate[] {
    return zone.shippingMethods
      .map((rate) => {
        let cost = rate.baseRate;

        switch (rate.rateType) {
          case "WEIGHT_BASED":
            if (rate.perKgRate && totalWeight > 0) {
              cost += totalWeight * rate.perKgRate;
            }
            break;

          case "ORDER_VALUE_BASED": {
            // Calculate order value (would need product prices)
            // For now, using a placeholder calculation
            const orderValue = items.reduce((sum, item) => {
              // This would need to fetch actual product prices
              return sum + (item.price || 0) * item.quantity;
            }, 0);

            if (rate.perItemRate) {
              cost += orderValue * (rate.perItemRate / 100); // Assuming percentage
            }
            break;
          }

          case "HYBRID":
            if (rate.perKgRate && totalWeight > 0) {
              cost += totalWeight * rate.perKgRate;
            }
            if (rate.perItemRate) {
              cost += items.length * rate.perItemRate;
            }
            break;
        }

        // Check for free shipping threshold
        if (rate.freeShippingThreshold && totalWeight <= rate.freeShippingThreshold) {
          cost = 0;
        }

        // Check weight limits
        if (rate.maxWeight && totalWeight > rate.maxWeight) {
          cost = -1; // Indicate this rate is not available
        }

        return {
          id: rate.id,
          carrier: rate.carrier,
          method: rate.method,
          cost: Math.max(cost, 0),
          estimatedDays: rate.estimatedDays,
          serviceName: `${rate.carrier} ${rate.method}`,
          rateType: rate.rateType
        };
      })
      .filter((rate: ShippingRate) => rate.cost >= 0); // Filter out unavailable rates
  }

  /**
   * Validate shipping configuration completeness
   */
  async validateShippingConfiguration(vendorId: string): Promise<{ isValid: boolean; missingFields: string[] }> {
    try {
      const config = await db.vendorShippingConfig.findUnique({
        where: { vendorId },
        include: {
          shippingZones: {
            include: {
              shippingMethods: true
            }
          }
        }
      });

      if (!config) {
        return { isValid: false, missingFields: ["shipping_configuration"] };
      }

      const missingFields: string[] = [];

      if (!config.shippingZones || config.shippingZones.length === 0) {
        missingFields.push("shipping_zones");
      } else {
        for (const zone of config.shippingZones) {
          if (!zone.shippingMethods || zone.shippingMethods.length === 0) {
            missingFields.push(`shipping_rates_for_zone_${zone.id}`);
          }
        }
      }

      return {
        isValid: missingFields.length === 0,
        missingFields
      };
    } catch (error) {
      logger.error("Error validating shipping configuration:", error);
      return { isValid: false, missingFields: ["validation_error"] };
    }
  }

  /**
   * Get shipping configuration summary for vendor
   */
  async getShippingConfigSummary(vendorId: string) {
    try {
      const config = await db.vendorShippingConfig.findUnique({
        where: { vendorId },
        include: {
          shippingZones: {
            include: {
              shippingMethods: true
            }
          }
        }
      });

      if (!config) {
        return null;
      }

      const totalZones = config.shippingZones.length;
      const totalRates = config.shippingZones.reduce((sum, zone) => sum + zone.shippingMethods.length, 0);
      const activeZones = config.shippingZones.filter((zone) => zone.isActive).length;
      const activeRates = config.shippingZones.reduce((sum, zone) => sum + zone.shippingMethods.filter((rate) => rate.isActive).length, 0);

      return {
        configId: config.id,
        defaultCarrier: config.defaultCarrier,
        defaultMethod: config.defaultMethod,
        handlingTime: config.handlingTime,
        freeShippingThreshold: config.freeShippingThreshold,
        isActive: config.isActive,
        summary: {
          totalZones,
          totalRates,
          activeZones,
          activeRates
        },
        zones: config.shippingZones.map((zone) => ({
          id: zone.id,
          zoneName: zone.zoneName,
          country: zone.country,
          state: zone.state,
          isActive: zone.isActive,
          rateCount: zone.shippingMethods.length
        }))
      };
    } catch (error) {
      logger.error("Error getting shipping config summary:", error);
      throw error;
    }
  }
}

export default new ShippingCalculationService();
