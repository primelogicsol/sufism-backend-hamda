import type { NotificationPriority } from "@prisma/client";
import { NotificationService } from "../services/notification.service.js";
import logger from "../utils/loggerUtils.js";

/**
 * Notification Integration Service
 * Provides integration points for sending notifications from other services
 */
export class NotificationIntegrationService {
  /**
   * Send order-related notifications
   */
  static async sendOrderNotification(
    userId: string,
    type: "ORDER_CREATED" | "ORDER_UPDATED" | "ORDER_CANCELLED" | "ORDER_SHIPPED" | "ORDER_DELIVERED",
    orderId: number,
    additionalData?: unknown
  ): Promise<void> {
    try {
      const notificationData = {
        userId,
        type,
        title: this.getOrderNotificationTitle(type),
        message: this.getOrderNotificationMessage(type, additionalData as Record<string, unknown>),
        priority: "NORMAL" as const,
        data: additionalData,
        orderId
      };

      await NotificationService.createNotification(notificationData);
      logger.info(`Order notification sent: ${type} for order ${orderId}`);
    } catch (error) {
      logger.error(`Error sending order notification: ${String(error)}`);
    }
  }

  /**
   * Send payment-related notifications
   */
  static async sendPaymentNotification(
    userId: string,
    type: "PAYMENT_SUCCESS" | "PAYMENT_FAILED" | "PAYMENT_REFUNDED",
    orderId: number,
    amount?: number,
    additionalData?: unknown
  ): Promise<void> {
    try {
      const notificationData = {
        userId,
        type,
        title: this.getPaymentNotificationTitle(type),
        message: this.getPaymentNotificationMessage(type, amount),
        priority: "HIGH" as const,
        data: { amount, ...(additionalData as Record<string, unknown>) },
        orderId
      };

      await NotificationService.createNotification(notificationData);
      logger.info(`Payment notification sent: ${type} for order ${orderId}`);
    } catch (error) {
      logger.error(`Error sending payment notification: ${String(error)}`);
    }
  }

  /**
   * Send inventory-related notifications
   */
  static async sendInventoryNotification(
    userId: string,
    type: "INVENTORY_LOW_STOCK" | "INVENTORY_OUT_OF_STOCK",
    productId: number,
    productName?: string,
    currentStock?: number,
    additionalData?: unknown
  ): Promise<void> {
    try {
      const notificationData = {
        userId,
        type,
        title: this.getInventoryNotificationTitle(type),
        message: this.getInventoryNotificationMessage(type, productName, currentStock),
        priority: (type === "INVENTORY_OUT_OF_STOCK" ? "HIGH" : "NORMAL") as NotificationPriority,
        data: { productId, productName, currentStock, ...(additionalData as Record<string, unknown>) }
      };

      await NotificationService.createNotification(notificationData);
      logger.info(`Inventory notification sent: ${type} for product ${productId}`);
    } catch (error) {
      logger.error(`Error sending inventory notification: ${String(error)}`);
    }
  }

  /**
   * Send return-related notifications
   */
  static async sendReturnNotification(
    userId: string,
    type: "RETURN_REQUESTED" | "RETURN_APPROVED" | "RETURN_REJECTED" | "RETURN_PROCESSED",
    returnId: number,
    orderId?: number,
    additionalData?: unknown
  ): Promise<void> {
    try {
      const notificationData = {
        userId,
        type,
        title: this.getReturnNotificationTitle(type),
        message: this.getReturnNotificationMessage(type, additionalData as Record<string, unknown>),
        priority: "NORMAL" as const,
        data: additionalData,
        returnId,
        orderId
      };

      await NotificationService.createNotification(notificationData);
      logger.info(`Return notification sent: ${type} for return ${returnId}`);
    } catch (error) {
      logger.error(`Error sending return notification: ${String(error)}`);
    }
  }

  /**
   * Send refund-related notifications
   */
  static async sendRefundNotification(
    userId: string,
    type: "REFUND_PROCESSED",
    returnId: number,
    orderId: number,
    amount?: number,
    additionalData?: unknown
  ): Promise<void> {
    try {
      const notificationData = {
        userId,
        type,
        title: this.getRefundNotificationTitle(type),
        message: this.getRefundNotificationMessage(type, amount),
        priority: "HIGH" as const,
        data: { amount, ...(additionalData as Record<string, unknown>) },
        returnId,
        orderId
      };

      await NotificationService.createNotification(notificationData);
      logger.info(`Refund notification sent: ${type} for return ${returnId}`);
    } catch (error) {
      logger.error(`Error sending refund notification: ${String(error)}`);
    }
  }

  /**
   * Send shipment-related notifications
   */
  static async sendShipmentNotification(
    userId: string,
    type: "SHIPMENT_CREATED" | "SHIPMENT_UPDATED" | "SHIPMENT_DELIVERED",
    shipmentId: number,
    orderId: number,
    trackingNumber?: string,
    additionalData?: unknown
  ): Promise<void> {
    try {
      const notificationData = {
        userId,
        type,
        title: this.getShipmentNotificationTitle(type),
        message: this.getShipmentNotificationMessage(type, trackingNumber),
        priority: "NORMAL" as const,
        data: { trackingNumber, ...(additionalData as Record<string, unknown>) },
        shipmentId,
        orderId
      };

      await NotificationService.createNotification(notificationData);
      logger.info(`Shipment notification sent: ${type} for shipment ${shipmentId}`);
    } catch (error) {
      logger.error(`Error sending shipment notification: ${String(error)}`);
    }
  }

  /**
   * Send vendor-related notifications
   */
  static async sendVendorNotification(userId: string, type: "VENDOR_APPROVED" | "VENDOR_REJECTED", additionalData?: unknown): Promise<void> {
    try {
      const notificationData = {
        userId,
        type,
        title: this.getVendorNotificationTitle(type),
        message: this.getVendorNotificationMessage(type, additionalData as Record<string, unknown>),
        priority: "HIGH" as const,
        data: additionalData
      };

      await NotificationService.createNotification(notificationData);
      logger.info(`Vendor notification sent: ${type} for user ${userId}`);
    } catch (error) {
      logger.error(`Error sending vendor notification: ${String(error)}`);
    }
  }

  /**
   * Send system-wide notifications
   */
  static sendSystemNotification(
    type: "SYSTEM_MAINTENANCE" | "SECURITY_ALERT" | "GENERAL",
    title: string,
    message: string,
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" = "NORMAL",
    data?: unknown
  ): void {
    try {
      NotificationService.broadcastSystemNotification(type, title, message, priority, data);
      logger.info(`System notification sent: ${type}`);
    } catch (error) {
      logger.error(`Error sending system notification: ${String(error)}`);
    }
  }

  // Helper methods for notification titles and messages
  private static getOrderNotificationTitle(type: string): string {
    const titles = {
      ORDER_CREATED: "Order Confirmed",
      ORDER_UPDATED: "Order Updated",
      ORDER_CANCELLED: "Order Cancelled",
      ORDER_SHIPPED: "Order Shipped",
      ORDER_DELIVERED: "Order Delivered"
    };
    return titles[type as keyof typeof titles] || "Order Update";
  }

  private static getOrderNotificationMessage(type: string, _data?: Record<string, unknown>): string {
    const messages = {
      ORDER_CREATED: `Your order has been confirmed and is being processed. Order ID: ${String(_data?.orderId) || "N/A"}`,
      ORDER_UPDATED: `Your order status has been updated. ${String(_data?.status) || "Status changed"}`,
      ORDER_CANCELLED: `Your order has been cancelled. ${String(_data?.reason) || "Please contact support if you have questions."}`,
      ORDER_SHIPPED: `Your order has been shipped! Tracking number: ${String(_data?.trackingNumber) || "N/A"}`,
      ORDER_DELIVERED: `Your order has been delivered successfully. Thank you for your purchase!`
    };
    return messages[type as keyof typeof messages] || "Order update notification";
  }

  private static getPaymentNotificationTitle(type: string): string {
    const titles = {
      PAYMENT_SUCCESS: "Payment Successful",
      PAYMENT_FAILED: "Payment Failed",
      PAYMENT_REFUNDED: "Refund Processed"
    };
    return titles[type as keyof typeof titles] || "Payment Update";
  }

  private static getPaymentNotificationMessage(type: string, amount?: number): string {
    const amountText = amount ? `$${amount.toFixed(2)}` : "";
    const messages = {
      PAYMENT_SUCCESS: `Your payment of ${amountText} has been processed successfully.`,
      PAYMENT_FAILED: `Your payment of ${amountText} could not be processed. Please try again or contact support.`,
      PAYMENT_REFUNDED: `A refund of ${amountText} has been processed and will appear in your account within 3-5 business days.`
    };
    return messages[type as keyof typeof messages] || "Payment notification";
  }

  private static getInventoryNotificationTitle(type: string): string {
    const titles = {
      INVENTORY_LOW_STOCK: "Low Stock Alert",
      INVENTORY_OUT_OF_STOCK: "Out of Stock Alert"
    };
    return titles[type as keyof typeof titles] || "Inventory Alert";
  }

  private static getInventoryNotificationMessage(type: string, productName?: string, currentStock?: number): string {
    const productText = productName ? ` for ${productName}` : "";
    const stockText = currentStock !== undefined ? ` (${currentStock} remaining)` : "";
    const messages = {
      INVENTORY_LOW_STOCK: `Low stock alert${productText}${stockText}. Consider restocking soon.`,
      INVENTORY_OUT_OF_STOCK: `Out of stock alert${productText}. Immediate restocking required.`
    };
    return messages[type as keyof typeof messages] || "Inventory notification";
  }

  private static getReturnNotificationTitle(type: string): string {
    const titles = {
      RETURN_REQUESTED: "Return Requested",
      RETURN_APPROVED: "Return Approved",
      RETURN_REJECTED: "Return Rejected",
      RETURN_PROCESSED: "Return Processed"
    };
    return titles[type as keyof typeof titles] || "Return Update";
  }

  private static getReturnNotificationMessage(type: string, _data?: Record<string, unknown>): string {
    const messages = {
      RETURN_REQUESTED: `Your return request has been submitted and is under review. Return ID: ${String(_data?.returnId) || "N/A"}`,
      RETURN_APPROVED: `Your return request has been approved. Please ship the items using the provided return label.`,
      RETURN_REJECTED: `Your return request has been rejected. Reason: ${String(_data?.reason) || "Please contact support for more information."}`,
      RETURN_PROCESSED: `Your return has been processed successfully. Refund will be processed within 3-5 business days.`
    };
    return messages[type as keyof typeof messages] || "Return notification";
  }

  private static getRefundNotificationTitle(type: string): string {
    const titles = {
      REFUND_PROCESSED: "Refund Processed"
    };
    return titles[type as keyof typeof titles] || "Refund Update";
  }

  private static getRefundNotificationMessage(type: string, amount?: number): string {
    const amountText = amount ? `$${amount.toFixed(2)}` : "";
    const messages = {
      REFUND_PROCESSED: `Your refund of ${amountText} has been processed successfully. It will appear in your account within 3-5 business days.`
    };
    return messages[type as keyof typeof messages] || "Refund notification";
  }

  private static getShipmentNotificationTitle(type: string): string {
    const titles = {
      SHIPMENT_CREATED: "Shipment Created",
      SHIPMENT_UPDATED: "Shipment Updated",
      SHIPMENT_DELIVERED: "Shipment Delivered"
    };
    return titles[type as keyof typeof titles] || "Shipment Update";
  }

  private static getShipmentNotificationMessage(type: string, trackingNumber?: string): string {
    const trackingText = trackingNumber ? ` Tracking: ${trackingNumber}` : "";
    const messages = {
      SHIPMENT_CREATED: `Your shipment has been created and is ready for pickup.${trackingText}`,
      SHIPMENT_UPDATED: `Your shipment status has been updated.${trackingText}`,
      SHIPMENT_DELIVERED: `Your shipment has been delivered successfully.${trackingText}`
    };
    return messages[type as keyof typeof messages] || "Shipment notification";
  }

  private static getVendorNotificationTitle(type: string): string {
    const titles = {
      VENDOR_APPROVED: "Vendor Application Approved",
      VENDOR_REJECTED: "Vendor Application Rejected"
    };
    return titles[type as keyof typeof titles] || "Vendor Update";
  }

  private static getVendorNotificationMessage(type: string, _data?: Record<string, unknown>): string {
    const messages = {
      VENDOR_APPROVED: `Congratulations! Your vendor application has been approved. You can now start selling your products.`,
      VENDOR_REJECTED: `Your vendor application has been rejected. Reason: ${String(_data?.reason) || "Please contact support for more information."}`
    };
    return messages[type as keyof typeof messages] || "Vendor notification";
  }
}
