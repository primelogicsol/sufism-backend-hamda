import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-type-assertion */

const vendorOnboardingController = {
  /**
   * Get comprehensive vendor onboarding status
   */
  getOnboardingStatus: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;

    try {
      // Get vendor information
      const vendor = (await db.user.findUnique({
        where: { id: vendorId },
        include: {
          vendorPayoutConfig: true,
          vendorShippingConfig: {
            include: {
              zones: {
                include: {
                  rates: true
                }
              }
            }
          } as any
        }
      })) as any;

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      // Calculate onboarding progress
      const steps = [
        {
          id: "account_setup",
          name: "Account Setup",
          description: "Create vendor account and basic information",
          isCompleted: !!vendor.fullName && !!vendor.email && !!vendor.businessName,
          isRequired: true,
          completedAt: vendor.fullName && vendor.email && vendor.businessName ? vendor.createdAt : null
        },
        {
          id: "payout_setup",
          name: "Payout Configuration",
          description: "Set up payment method for receiving payouts",
          isCompleted: vendor.payoutConfigCompleted && !!(vendor as any).vendorPayoutConfig,
          isRequired: true,
          completedAt: vendor.payoutConfigCompleted ? (vendor as any).vendorPayoutConfig?.createdAt : null
        },
        {
          id: "shipping_setup",
          name: "Shipping Configuration",
          description: "Configure shipping rates and zones",
          isCompleted: vendor.shippingConfigCompleted && !!(vendor as any).vendorShippingConfig,
          isRequired: true,
          completedAt: vendor.shippingConfigCompleted ? (vendor as any).vendorShippingConfig?.createdAt : null
        },
        {
          id: "profile_completion",
          name: "Profile Completion",
          description: "Complete your vendor profile information",
          isCompleted: !!(vendor as any).taxId && !!vendor.businessType && !!vendor.address,
          isRequired: false,
          completedAt: (vendor as any).taxId && vendor.businessType && vendor.address ? (vendor as any).updatedAt : null
        }
      ];

      const completedSteps = steps.filter((step) => step.isCompleted).length;
      const requiredSteps = steps.filter((step) => step.isRequired);
      const completedRequiredSteps = requiredSteps.filter((step) => step.isCompleted).length;
      const overallProgress = Math.round((completedSteps / steps.length) * 100);

      const isCompleted = completedRequiredSteps === requiredSteps.length;
      const canStartSelling = isCompleted && vendor.vendoraccepted;

      // Determine next steps
      const nextSteps = [];
      if (!steps[0].isCompleted) nextSteps.push("Complete account setup");
      if (!steps[1].isCompleted) nextSteps.push("Set up payout configuration");
      if (!steps[2].isCompleted) nextSteps.push("Configure shipping rates and zones");
      if (!steps[3].isCompleted) nextSteps.push("Complete profile information");
      if (isCompleted && !vendor.vendoraccepted) nextSteps.push("Wait for admin approval");

      // Estimate completion time
      const remainingSteps = steps.filter((step) => !step.isCompleted).length;
      const estimatedCompletionTime = remainingSteps > 0 ? `${remainingSteps * 15} minutes` : "Complete";

      // Help resources
      const helpResources = [];
      if (!steps[1].isCompleted) helpResources.push("Payout setup guide");
      if (!steps[2].isCompleted) helpResources.push("Shipping configuration tutorial");
      if (!steps[3].isCompleted) helpResources.push("Profile completion help");
      if (isCompleted && !vendor.vendoraccepted) helpResources.push("Approval process information");

      return httpResponse(req, res, reshttp.okCode, "Onboarding status retrieved successfully", {
        vendorId: vendor.id,
        overallProgress,
        isCompleted,
        canStartSelling,
        steps,
        nextSteps,
        estimatedCompletionTime,
        helpResources,
        vendorStatus: {
          isVerified: vendor.isVerified,
          vendorAccepted: vendor.vendoraccepted,
          payoutConfigCompleted: vendor.payoutConfigCompleted,
          shippingConfigCompleted: vendor.shippingConfigCompleted
        }
      }) as any;
    } catch (error) {
      logger.error("Error retrieving onboarding status:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to retrieve onboarding status");
    }
  }),

  /**
   * Get detailed onboarding requirements checklist
   */
  getOnboardingRequirements: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;

    try {
      // Get vendor information
      const vendor = (await db.user.findUnique({
        where: { id: vendorId },
        include: {
          vendorPayoutConfig: true,
          vendorShippingConfig: {
            include: {
              zones: {
                include: {
                  rates: true
                }
              }
            }
          } as any
        }
      })) as any;

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      const requirements = [
        {
          category: "Account Information",
          items: [
            {
              id: "business_name",
              name: "Business Name",
              description: "Legal business name",
              isRequired: true,
              isCompleted: !!vendor.businessName
            },
            {
              id: "tax_id",
              name: "Tax ID/EIN",
              description: "Federal tax identification number",
              isRequired: true,
              isCompleted: !!(vendor as any).taxId
            },
            {
              id: "business_address",
              name: "Business Address",
              description: "Physical business address",
              isRequired: true,
              isCompleted: !!vendor.address && !!vendor.city && !!vendor.state && !!vendor.zipCode
            },
            {
              id: "contact_info",
              name: "Contact Information",
              description: "Phone number and email",
              isRequired: true,
              isCompleted: !!vendor.phone && !!vendor.email
            }
          ]
        },
        {
          category: "Payment Setup",
          items: [
            {
              id: "payout_method",
              name: "Payout Method",
              description: "Choose how to receive payments",
              isRequired: true,
              isCompleted: !!(vendor as any).vendorPayoutConfig
            },
            {
              id: "bank_verification",
              name: "Bank Account Verification",
              description: "Verify bank account details",
              isRequired: true,
              isCompleted: (vendor as any).vendorPayoutConfig?.isVerified || false
            },
            {
              id: "tax_documents",
              name: "Tax Documents",
              description: "Upload required tax forms",
              isRequired: true,
              isCompleted: !!(vendor as any).vendorPayoutConfig?.taxDetails
            }
          ]
        },
        {
          category: "Shipping Setup",
          items: [
            {
              id: "shipping_zones",
              name: "Shipping Zones",
              description: "Define shipping zones and coverage",
              isRequired: true,
              isCompleted: ((vendor as any).vendorShippingConfig?.zones?.length || 0) > 0
            },
            {
              id: "shipping_rates",
              name: "Shipping Rates",
              description: "Set up shipping rates for each zone",
              isRequired: true,
              isCompleted: (vendor as any).vendorShippingConfig?.zones?.some((zone: any) => zone.rates?.length > 0) || false
            },
            {
              id: "carrier_setup",
              name: "Carrier Configuration",
              description: "Configure shipping carriers",
              isRequired: false,
              isCompleted: !!(vendor as any).vendorShippingConfig?.defaultCarrier
            }
          ]
        },
        {
          category: "Business Verification",
          items: [
            {
              id: "business_license",
              name: "Business License",
              description: "Upload business license document",
              isRequired: false,
              isCompleted: !!vendor.vendorNic
            },
            {
              id: "admin_approval",
              name: "Admin Approval",
              description: "Wait for admin approval",
              isRequired: true,
              isCompleted: vendor.vendoraccepted || false
            }
          ]
        }
      ];

      // Calculate summary
      const allItems = requirements.flatMap((category) => category.items);
      const totalRequirements = allItems.length;
      const completedRequirements = allItems.filter((item) => item.isCompleted).length;
      const remainingRequirements = totalRequirements - completedRequirements;
      const completionPercentage = Math.round((completedRequirements / totalRequirements) * 100);

      return httpResponse(req, res, reshttp.okCode, "Onboarding requirements retrieved successfully", {
        requirements,
        summary: {
          totalRequirements,
          completedRequirements,
          remainingRequirements,
          completionPercentage
        },
        vendorStatus: {
          isVerified: vendor.isVerified,
          vendorAccepted: vendor.vendoraccepted,
          payoutConfigCompleted: vendor.payoutConfigCompleted,
          shippingConfigCompleted: vendor.shippingConfigCompleted
        }
      }) as any;
    } catch (error) {
      logger.error("Error retrieving onboarding requirements:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to retrieve onboarding requirements");
    }
  }),

  /**
   * Update onboarding progress
   */
  updateOnboardingProgress: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const { stepId, isCompleted, notes } = req.body as {
      stepId: string;
      isCompleted: boolean;
      notes?: string;
    };

    try {
      const vendor = (await db.user.findUnique({
        where: { id: vendorId }
      })) as any;

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      // Update specific step completion
      const updateData: any = { updatedAt: new Date() };

      switch (stepId) {
        case "payout_setup":
          updateData.payoutConfigCompleted = isCompleted;
          break;
        case "shipping_setup":
          updateData.shippingConfigCompleted = isCompleted;
          break;
        case "profile_completion":
          // Profile completion is determined by required fields
          break;
        default:
          return httpResponse(req, res, reshttp.badRequestCode, "Invalid step ID");
      }

      const updatedVendor = (await db.user.update({
        where: { id: vendorId },
        data: updateData
      })) as any;

      logger.info(`Onboarding progress updated for vendor ${vendorId}: ${stepId} = ${isCompleted}`);

      return httpResponse(req, res, reshttp.okCode, "Onboarding progress updated successfully", {
        vendorId: updatedVendor.id,
        stepId,
        isCompleted,
        notes,
        updatedAt: (updatedVendor as any).updatedAt
      }) as any;
    } catch (error) {
      logger.error("Error updating onboarding progress:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update onboarding progress");
    }
  }),

  /**
   * Get vendor readiness status
   */
  getVendorReadinessStatus: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;

    try {
      const vendor = (await db.user.findUnique({
        where: { id: vendorId },
        include: {
          vendorPayoutConfig: true,
          vendorShippingConfig: {
            include: {
              zones: {
                include: {
                  rates: true
                }
              }
            }
          } as any
        }
      })) as any;

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      const readinessChecks = {
        accountSetup: {
          isComplete: !!vendor.fullName && !!vendor.email && !!vendor.businessName,
          missing: [] as string[]
        },
        payoutSetup: {
          isComplete: vendor.payoutConfigCompleted && !!(vendor as any).vendorPayoutConfig,
          missing: [] as string[]
        },
        shippingSetup: {
          isComplete: vendor.shippingConfigCompleted && !!(vendor as any).vendorShippingConfig,
          missing: [] as string[]
        },
        businessVerification: {
          isComplete: vendor.vendoraccepted,
          missing: [] as string[]
        }
      };

      // Check what's missing
      if (!vendor.fullName) readinessChecks.accountSetup.missing.push("Full name");
      if (!vendor.email) readinessChecks.accountSetup.missing.push("Email");
      if (!vendor.businessName) readinessChecks.accountSetup.missing.push("Business name");
      if (!(vendor as any).taxId) readinessChecks.accountSetup.missing.push("Tax ID");

      if (!(vendor as any).vendorPayoutConfig) {
        readinessChecks.payoutSetup.missing.push("Payout configuration");
      } else if (!(vendor as any).vendorPayoutConfig.isVerified) {
        readinessChecks.payoutSetup.missing.push("Bank account verification");
      }

      if (!(vendor as any).vendorShippingConfig) {
        readinessChecks.shippingSetup.missing.push("Shipping configuration");
      } else {
        const zones = (vendor as any).vendorShippingConfig.zones || [];
        if (zones.length === 0) {
          readinessChecks.shippingSetup.missing.push("Shipping zones");
        } else {
          const zonesWithoutRates = zones.filter((zone: any) => !zone.rates || zone.rates.length === 0);
          if (zonesWithoutRates.length > 0) {
            readinessChecks.shippingSetup.missing.push("Shipping rates for all zones");
          }
        }
      }

      if (!vendor.vendoraccepted) {
        readinessChecks.businessVerification.missing.push("Admin approval");
      }

      const isReadyToSell = Object.values(readinessChecks).every((check) => check.isComplete);
      const overallReadiness = Math.round(
        (Object.values(readinessChecks).filter((check) => check.isComplete).length / Object.keys(readinessChecks).length) * 100
      );

      return httpResponse(req, res, reshttp.okCode, "Vendor readiness status retrieved successfully", {
        vendorId: vendor.id,
        isReadyToSell,
        overallReadiness,
        readinessChecks,
        nextActions: Object.values(readinessChecks)
          .filter((check) => !check.isComplete)
          .flatMap((check) => check.missing),
        estimatedTimeToReady: isReadyToSell ? "Ready now" : "30-60 minutes"
      }) as any;
    } catch (error) {
      logger.error("Error retrieving vendor readiness status:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to retrieve vendor readiness status");
    }
  })
};

export default vendorOnboardingController;
