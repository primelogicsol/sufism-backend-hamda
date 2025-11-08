import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

export default {
  /**
   * Create or update vendor payout configuration
   */
  createOrUpdatePayoutConfig: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const {
      payoutMethod,
      payoutFrequency,
      bankName,
      accountNumber,
      routingNumber,
      bankAddress,
      paypalEmail,
      stripeAccountId,
      minimumPayout,
      autoPayout,
      taxId,
      taxForm
    } = req.body as {
      payoutMethod: string;
      payoutFrequency?: string;
      bankName?: string;
      accountNumber?: string;
      routingNumber?: string;
      bankAddress?: string;
      paypalEmail?: string;
      stripeAccountId?: string;
      minimumPayout?: number;
      autoPayout?: boolean;
      taxId?: string;
      taxForm?: string;
    };

    try {
      // Check if vendor exists and has vendor role
      const vendor = await db.user.findFirst({
        where: { id: vendorId, role: "vendor" }
      });

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      // Validate required fields based on payout method
      if (payoutMethod === "BANK_TRANSFER") {
        if (!bankName || !accountNumber || !routingNumber) {
          return httpResponse(req, res, reshttp.badRequestCode, "Bank name, account number, and routing number are required for bank transfer");
        }
      } else if (payoutMethod === "PAYPAL") {
        if (!paypalEmail) {
          return httpResponse(req, res, reshttp.badRequestCode, "PayPal email is required for PayPal payouts");
        }
      } else if (payoutMethod === "STRIPE_CONNECT") {
        if (!stripeAccountId) {
          return httpResponse(req, res, reshttp.badRequestCode, "Stripe account ID is required for Stripe Connect payouts");
        }
      }

      // Create or update payout configuration
      const payoutConfig = await (db as any).vendorPayoutConfig.upsert({
        where: { vendorId },
        update: {
          payoutMethod,
          payoutFrequency: payoutFrequency || "WEEKLY",
          bankName,
          accountNumber,
          routingNumber,
          bankAddress,
          paypalEmail,
          stripeAccountId,
          minimumPayout: minimumPayout || 50.0,
          autoPayout: autoPayout !== undefined ? autoPayout : true,
          taxId,
          taxForm,
          isActive: true,
          isVerified: false // Reset verification when config changes
        },
        create: {
          vendorId,
          payoutMethod,
          payoutFrequency: payoutFrequency || "WEEKLY",
          bankName,
          accountNumber,
          routingNumber,
          bankAddress,
          paypalEmail,
          stripeAccountId,
          minimumPayout: minimumPayout || 50.0,
          autoPayout: autoPayout !== undefined ? autoPayout : true,
          taxId,
          taxForm,
          isActive: true,
          isVerified: false
        }
      });

      // Update vendor's payout configuration completion status
      await db.user.update({
        where: { id: vendorId },
        data: { payoutConfigCompleted: true } as any
      });

      return httpResponse(req, res, reshttp.okCode, "Payout configuration updated successfully", payoutConfig);
    } catch (error) {
      logger.error("Error creating/updating payout config:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update payout configuration");
    }
  }),

  /**
   * Get vendor payout configuration
   */
  getPayoutConfig: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;

    try {
      const payoutConfig = await (db as any).vendorPayoutConfig.findUnique({
        where: { vendorId }
      });

      if (!payoutConfig) {
        return httpResponse(req, res, reshttp.notFoundCode, "Payout configuration not found");
      }

      // Remove sensitive information for security
      const safeConfig = {
        ...payoutConfig,
        accountNumber: payoutConfig.accountNumber ? payoutConfig.accountNumber.replace(/(.{4}).*(.{4})/, "$1****$2") : null,
        routingNumber: payoutConfig.routingNumber ? payoutConfig.routingNumber.replace(/(.{2}).*(.{2})/, "$1****$2") : null,
        taxId: payoutConfig.taxId ? payoutConfig.taxId.replace(/(.{4}).*(.{4})/, "$1****$2") : null
      };

      return httpResponse(req, res, reshttp.okCode, "Payout configuration retrieved successfully", safeConfig);
    } catch (error) {
      logger.error("Error getting payout config:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to retrieve payout configuration");
    }
  }),

  /**
   * Verify payout configuration (Admin only)
   */
  verifyPayoutConfig: asyncHandler(async (req: _Request, res) => {
    const { vendorId } = req.params;
    const { verifiedBy } = req.body;

    try {
      // Check if user is admin
      const admin = await db.user.findFirst({
        where: { id: req.userFromToken?.id, role: "admin" }
      });

      if (!admin) {
        return httpResponse(req, res, reshttp.unauthorizedCode, "Admin access required");
      }

      const payoutConfig = await (db as any).vendorPayoutConfig.findUnique({
        where: { vendorId }
      });

      if (!payoutConfig) {
        return httpResponse(req, res, reshttp.notFoundCode, "Payout configuration not found");
      }

      const updatedConfig = await (db as any).vendorPayoutConfig.update({
        where: { vendorId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy
        }
      });

      return httpResponse(req, res, reshttp.okCode, "Payout configuration verified successfully", updatedConfig);
    } catch (error) {
      logger.error("Error verifying payout config:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to verify payout configuration");
    }
  }),

  /**
   * Get payout methods available
   */
  getPayoutMethods: asyncHandler(async (req: _Request, res) => {
    try {
      const payoutMethods = [
        {
          value: "BANK_TRANSFER",
          label: "Bank Transfer",
          description: "Direct transfer to your bank account",
          requiredFields: ["bankName", "accountNumber", "routingNumber"],
          processingTime: "1-3 business days"
        },
        {
          value: "PAYPAL",
          label: "PayPal",
          description: "Transfer to your PayPal account",
          requiredFields: ["paypalEmail"],
          processingTime: "Same day"
        },
        {
          value: "STRIPE_CONNECT",
          label: "Stripe Connect",
          description: "Transfer to your Stripe account",
          requiredFields: ["stripeAccountId"],
          processingTime: "1-2 business days"
        },
        {
          value: "CHECK",
          label: "Check",
          description: "Physical check mailed to your address",
          requiredFields: [],
          processingTime: "5-7 business days"
        },
        {
          value: "WIRE_TRANSFER",
          label: "Wire Transfer",
          description: "International wire transfer",
          requiredFields: ["bankName", "accountNumber", "routingNumber"],
          processingTime: "2-5 business days"
        }
      ];

      const payoutFrequencies = [
        { value: "DAILY", label: "Daily" },
        { value: "WEEKLY", label: "Weekly" },
        { value: "BI_WEEKLY", label: "Bi-weekly" },
        { value: "MONTHLY", label: "Monthly" }
      ];

      return await Promise.resolve(
        httpResponse(req, res, reshttp.okCode, "Payout methods retrieved successfully", {
          payoutMethods,
          payoutFrequencies
        })
      );
    } catch (error) {
      logger.error("Error getting payout methods:", error);
      return await Promise.resolve(httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to retrieve payout methods"));
    }
  }),

  /**
   * Update payout configuration status
   */
  updatePayoutConfigStatus: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;
    const { isActive } = req.body as { isActive: boolean };

    try {
      const payoutConfig = await (db as any).vendorPayoutConfig.findUnique({
        where: { vendorId }
      });

      if (!payoutConfig) {
        return httpResponse(req, res, reshttp.notFoundCode, "Payout configuration not found");
      }

      const updatedConfig = await (db as any).vendorPayoutConfig.update({
        where: { vendorId },
        data: { isActive }
      });

      return httpResponse(req, res, reshttp.okCode, "Payout configuration status updated successfully", updatedConfig);
    } catch (error) {
      logger.error("Error updating payout config status:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update payout configuration status");
    }
  }),

  /**
   * Get vendor onboarding status
   */
  getOnboardingStatus: asyncHandler(async (req: _Request, res) => {
    const vendorId = req.userFromToken?.id;

    try {
      const vendor = await db.user.findFirst({
        where: { id: vendorId, role: "vendor" },
        select: {
          id: true,
          shippingConfigCompleted: true,
          payoutConfigCompleted: true,
          vendoraccepted: true,
          isCompleted: true
        } as any
      });

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      const vendorTyped = vendor as any;
      const onboardingStatus = {
        vendorId: vendorTyped.id,
        steps: {
          basicInfo: vendorTyped.isCompleted || false,
          payoutConfig: vendorTyped.payoutConfigCompleted || false,
          shippingConfig: vendorTyped.shippingConfigCompleted || false,
          approval: vendorTyped.vendoraccepted || false
        },
        canSell: vendorTyped.payoutConfigCompleted && vendorTyped.shippingConfigCompleted && vendorTyped.vendoraccepted,
        completedSteps: [
          vendorTyped.isCompleted && "basicInfo",
          vendorTyped.payoutConfigCompleted && "payoutConfig",
          vendorTyped.shippingConfigCompleted && "shippingConfig",
          vendorTyped.vendoraccepted && "approval"
        ].filter(Boolean)
      };

      return httpResponse(req, res, reshttp.okCode, "Onboarding status retrieved successfully", onboardingStatus);
    } catch (error) {
      logger.error("Error getting onboarding status:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to retrieve onboarding status");
    }
  })
};
