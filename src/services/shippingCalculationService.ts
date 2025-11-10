import { db } from "../configs/database.js";
import logger from "../utils/loggerUtils.js";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */

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
      logger.info(`Finding zone for destination:`, {
        country: request.destination.country,
        state: request.destination.state,
        zipCode: request.destination.zipCode,
        zonesCount: shippingConfig.shippingZones.length
      });

      // Log all zones for debugging
      shippingConfig.shippingZones.forEach((zone) => {
        const shippingMethods = "shippingMethods" in zone && Array.isArray(zone.shippingMethods) ? zone.shippingMethods : [];
        logger.info(`Zone ${zone.id} (${zone.zoneName}):`, {
          country: zone.country,
          state: zone.state,
          zipCodeRanges: zone.zipCodeRanges,
          shippingMethodsCount: shippingMethods.length
        });
      });

      const applicableZone = this.findApplicableZone(shippingConfig.shippingZones, request.destination);

      if (!applicableZone) {
        // Log detailed information about why zones didn't match
        logger.warn(`No zone matched for destination:`, {
          destination: request.destination,
          totalZones: shippingConfig.shippingZones.length,
          activeZones: shippingConfig.shippingZones.length,
          zones: shippingConfig.shippingZones.map((z) => ({
            id: z.id,
            name: z.zoneName,
            country: z.country,
            state: z.state,
            hasZipRanges: !!z.zipCodeRanges,
            zipRanges: z.zipCodeRanges
          }))
        });

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

      const zoneShippingMethods =
        "shippingMethods" in applicableZone && Array.isArray(applicableZone.shippingMethods) ? applicableZone.shippingMethods : [];
      logger.info(`Found applicable zone:`, {
        id: applicableZone.id,
        zoneName: applicableZone.zoneName,
        country: applicableZone.country,
        state: applicableZone.state,
        shippingMethodsCount: zoneShippingMethods.length
      });

      // Calculate rates for each shipping method
      // Prisma includes add shippingMethods dynamically, so we need to assert the type
      const zoneWithMethods = applicableZone as typeof applicableZone & {
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
      };

      const availableRates = this.calculateRatesForZone(zoneWithMethods, totalWeight, request.items);

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
    // Normalize destination values for comparison
    // Ensure zipCode is converted to string (it might come as number from JSON)
    const destCountry = String(destination.country || "")
      .trim()
      .toUpperCase();
    const destState = destination.state ? String(destination.state).trim().toUpperCase() : "";
    const destZip = String(destination.zipCode || "").trim();

    logger.info(`Finding zone - normalized destination:`, {
      destCountry,
      destState: destState || "(not provided)",
      destZip,
      zonesToCheck: zones.length
    });

    // Sort zones by specificity (most specific first)
    // Priority: has state + has zip ranges > has state > has zip ranges > country only
    const sortedZones = [...zones].sort((a, b) => {
      const aScore = (a.state ? 2 : 0) + (this.hasValidZipRanges(a.zipCodeRanges) ? 1 : 0);
      const bScore = (b.state ? 2 : 0) + (this.hasValidZipRanges(b.zipCodeRanges) ? 1 : 0);
      return bScore - aScore;
    });

    logger.info(`Zones sorted by specificity (most specific first)`);

    return sortedZones.find((zone) => {
      let matches = true;
      let reason = "";

      logger.info(`Checking zone ${zone.id} (${zone.zoneName}):`, {
        zoneCountry: zone.country,
        zoneState: zone.state,
        hasZipRanges: !!zone.zipCodeRanges
      });

      // Check country match (case-insensitive)
      // Handle null/undefined and ensure both are normalized to uppercase for comparison
      if (zone.country) {
        const zoneCountry = String(zone.country).trim().toUpperCase();
        // Both destCountry and zoneCountry are already uppercase, so comparison is case-insensitive
        if (zoneCountry !== destCountry) {
          matches = false;
          reason = `Country mismatch: ${zoneCountry} != ${destCountry}`;
          logger.debug(`Zone ${zone.id} rejected: ${reason}`);
          return false;
        }
      }

      // Check state match (state is optional - zone can match even if destination doesn't have state)
      // Case-insensitive comparison: both normalized to uppercase
      if (matches && zone.state) {
        const zoneState = String(zone.state).trim().toUpperCase();
        // If destination has state, it must match zone's state (case-insensitive)
        // If destination doesn't have state, zone can still match (state is optional)
        if (destState && zoneState !== destState) {
          matches = false;
          reason = `State mismatch: ${zoneState} != ${destState}`;
          logger.debug(`Zone ${zone.id} rejected: ${reason}`);
          return false;
        }
        // If zone has state but destination doesn't, allow match (state is optional)
        logger.debug(`Zone ${zone.id} has state "${zoneState}" but destination has no state - allowing match (state is optional)`);
      }

      // Check zip code ranges if specified
      if (matches && zone.zipCodeRanges) {
        const zipRanges = this.parseZipCodeRanges(zone.zipCodeRanges);
        const validRanges = this.filterValidZipRanges(zipRanges);

        // Only check zip code if there are valid ranges
        if (validRanges.length > 0) {
          const isInRange = validRanges.some((range) => {
            if (typeof range === "string") {
              const prefix = range.trim();
              return destZip.startsWith(prefix);
            } else if (range && typeof range === "object") {
              const from = String((range as any).from || "").trim();
              const to = String((range as any).to || "").trim();

              // Normalize zip codes to same length for comparison (pad with zeros if needed)
              const normalizedDest = this.normalizeZipCode(destZip);
              const normalizedFrom = this.normalizeZipCode(from);
              const normalizedTo = this.normalizeZipCode(to);

              const matches = normalizedDest >= normalizedFrom && normalizedDest <= normalizedTo;
              logger.debug(
                `Zip range check: ${destZip} in [${from}, ${to}] = ${matches} (normalized: ${normalizedDest} in [${normalizedFrom}, ${normalizedTo}])`
              );
              return matches;
            }
            return false;
          });

          if (!isInRange) {
            matches = false;
            reason = `Zip code "${destZip}" not in any valid ranges`;
            logger.debug(`Zone ${zone.id} rejected: ${reason}. Valid ranges:`, validRanges);
            return false;
          }
        } else {
          // Zone has zipCodeRanges defined but all are empty/invalid, skip zip check (allow zone)
          logger.debug(`Zone ${zone.id} has zipCodeRanges but all are invalid/empty, skipping zip check`);
        }
      }

      if (matches) {
        logger.info(`✅ Zone ${zone.id} (${zone.zoneName}) MATCHES destination`);
      }

      return matches;
    });
  }

  /**
   * Check if zipCodeRanges has valid ranges
   */
  private hasValidZipRanges(zipCodeRanges?: unknown): boolean {
    if (!zipCodeRanges) return false;
    const ranges = this.parseZipCodeRanges(zipCodeRanges);
    const valid = this.filterValidZipRanges(ranges);
    return valid.length > 0;
  }

  /**
   * Parse zip code ranges from various formats
   */
  private parseZipCodeRanges(zipCodeRanges: unknown): Array<{ from: string; to: string } | string> {
    let zipRanges: Array<{ from: string; to: string } | string> = [];

    if (typeof zipCodeRanges === "string") {
      try {
        zipRanges = JSON.parse(zipCodeRanges) as Array<{ from: string; to: string } | string>;
      } catch {
        zipRanges = [];
      }
    } else if (Array.isArray(zipCodeRanges)) {
      zipRanges = zipCodeRanges as Array<{ from: string; to: string } | string>;
    } else if (typeof zipCodeRanges === "object" && zipCodeRanges !== null) {
      // Some ORMs may return JSON fields as objects; attempt to coerce to expected array shape
      zipRanges = (zipCodeRanges as unknown as Array<{ from: string; to: string } | string>) || [];
    }

    return zipRanges;
  }

  /**
   * Filter out empty or invalid zip code ranges
   */
  private filterValidZipRanges(zipRanges: Array<{ from: string; to: string } | string>): Array<{ from: string; to: string } | string> {
    return zipRanges.filter((range) => {
      if (typeof range === "string") {
        return range.trim().length > 0;
      } else if (range && typeof range === "object" && (range as any).from !== undefined && (range as any).to !== undefined) {
        const from = String((range as any).from || "").trim();
        const to = String((range as any).to || "").trim();
        // Both must be non-empty
        return from.length > 0 && to.length > 0;
      }
      return false;
    });
  }

  /**
   * Normalize zip code for comparison (pad to 5 digits, handle US zip codes)
   */
  private normalizeZipCode(zip: string | number): string {
    // Convert to string first (handles both string and number inputs)
    const zipStr = String(zip);
    const cleaned = zipStr.trim().replace(/[^0-9]/g, ""); // Remove non-numeric chars
    // Pad to at least 5 digits for comparison (US standard)
    return cleaned.padStart(5, "0");
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
        // For ORDER_VALUE_BASED and HYBRID: check order value
        // For WEIGHT_BASED: check weight
        if (rate.freeShippingThreshold) {
          if (rate.rateType === "ORDER_VALUE_BASED" || rate.rateType === "HYBRID") {
            // Calculate order value for value-based thresholds
            const orderValue = items.reduce((sum, item) => {
              return sum + (item.price || 0) * item.quantity;
            }, 0);
            if (orderValue >= rate.freeShippingThreshold) {
              cost = 0;
            }
          } else if (rate.rateType === "WEIGHT_BASED") {
            // For weight-based rates, use weight threshold
            if (totalWeight >= rate.freeShippingThreshold) {
              cost = 0;
            }
          } else {
            // For FIXED rates, assume threshold is for order value
            const orderValue = items.reduce((sum, item) => {
              return sum + (item.price || 0) * item.quantity;
            }, 0);
            if (orderValue >= rate.freeShippingThreshold) {
              cost = 0;
            }
          }
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
