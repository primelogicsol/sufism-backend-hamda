import { Prisma, NotificationType, NotificationPriority, NotificationStatus } from "@prisma/client";
import { db } from "../configs/database.js";
import logger from "../utils/loggerUtils.js";
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: any;
  orderId?: number;
  returnId?: number;
  shipmentId?: number;
  expiresAt?: Date;
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  variables?: string[];
}

export interface NotificationPreference {
  userId: string;
  type: NotificationType;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  webSocketEnabled?: boolean;
}

export interface WebSocketConnection {
  userId: string;
  connectionId: string;
  socketId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export class NotificationService {
  private static io: SocketIOServer | null = null;
  private static activeConnections: Map<string, WebSocketConnection> = new Map();

  /**
   * Initialize Socket.IO server
   */
  static initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ["websocket", "polling"]
    });

    this.io.on("connection", (socket) => {
      logger.info(`WebSocket connection established: ${socket.id}`);

      // Handle authentication
      socket.on("authenticate", async (data: { token: string }) => {
        try {
          // In a real implementation, you would verify the JWT token here
          // For now, we'll assume the token is valid and contains userId
          const userId = data.token; // This should be extracted from JWT
          
          const connection: WebSocketConnection = {
            userId,
            connectionId: socket.id,
            socketId: socket.id,
            userAgent: socket.handshake.headers["user-agent"],
            ipAddress: socket.handshake.address
          };

          this.activeConnections.set(socket.id, connection);

          // Store connection in database
          await db.webSocketConnection.create({
            data: {
              userId,
              connectionId: socket.id,
              socketId: socket.id,
              userAgent: connection.userAgent,
              ipAddress: connection.ipAddress,
              lastPingAt: new Date()
            }
          });

          // Join user-specific room
          socket.join(`user:${userId}`);
          
          socket.emit("authenticated", { success: true });
          logger.info(`User ${userId} authenticated with socket ${socket.id}`);
        } catch (error) {
          logger.error(`Authentication error: ${error}`);
          socket.emit("authentication_error", { message: "Authentication failed" });
        }
      });

      // Handle ping/pong for connection health
      socket.on("ping", () => {
        socket.emit("pong");
        const connection = this.activeConnections.get(socket.id);
        if (connection) {
          db.webSocketConnection.updateMany({
            where: { connectionId: socket.id },
            data: { lastPingAt: new Date() }
          });
        }
      });

      // Handle disconnection
      socket.on("disconnect", async () => {
        logger.info(`WebSocket disconnected: ${socket.id}`);
        
        const connection = this.activeConnections.get(socket.id);
        if (connection) {
          // Update connection status in database
          await db.webSocketConnection.updateMany({
            where: { connectionId: socket.id },
            data: {
              isActive: false,
              disconnectedAt: new Date()
            }
          });

          this.activeConnections.delete(socket.id);
        }
      });
    });

    return this.io;
  }

  /**
   * Create notification
   */
  static async createNotification(data: NotificationData): Promise<{ success: boolean; notification: any; message: string }> {
    try {
      const {
        userId,
        type,
        title,
        message,
        priority = "NORMAL",
        data: notificationData,
        orderId,
        returnId,
        shipmentId,
        expiresAt
      } = data;

      // Check user notification preferences
      const preferences = await db.notificationPreference.findFirst({
        where: { userId, type }
      });

      if (preferences && !preferences.webSocketEnabled) {
        return { success: false, notification: null, message: "WebSocket notifications disabled for this type" };
      }

      // Create notification
      const notification = await db.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          priority,
          data: notificationData ? JSON.stringify(notificationData) : null,
          orderId,
          returnId,
          shipmentId,
          expiresAt,
          status: "PENDING"
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          order: {
            select: {
              id: true,
              status: true,
              amount: true
            }
          },
          return: {
            select: {
              id: true,
              status: true,
              reason: true
            }
          },
          shipment: {
            select: {
              id: true,
              trackingNumber: true,
              status: true
            }
          }
        }
      });

      // Send real-time notification
      await this.sendRealTimeNotification(notification);

      logger.info(`Notification created for user ${userId}: ${type}`);
      
      return {
        success: true,
        notification,
        message: "Notification created and sent successfully"
      };
    } catch (error) {
      logger.error(`Error creating notification: ${error}`);
      throw error;
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  static async sendRealTimeNotification(notification: any): Promise<void> {
    try {
      if (!this.io) {
        logger.warn("Socket.IO server not initialized");
        return;
      }

      // Send to user-specific room
      this.io.to(`user:${notification.userId}`).emit("notification", {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        data: notification.data ? JSON.parse(notification.data) : null,
        orderId: notification.orderId,
        returnId: notification.returnId,
        shipmentId: notification.shipmentId,
        createdAt: notification.createdAt,
        isRead: notification.isRead
      });

      // Update notification status
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: "SENT",
          sentAt: new Date()
        }
      });

      logger.info(`Real-time notification sent to user ${notification.userId}`);
    } catch (error) {
      logger.error(`Error sending real-time notification: ${error}`);
      
      // Update notification status to failed
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          retryCount: { increment: 1 },
          lastRetryAt: new Date()
        }
      });
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: number, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const notification = await db.notification.findFirst({
        where: { id: notificationId, userId }
      });

      if (!notification) {
        return { success: false, message: "Notification not found" };
      }

      await db.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
          status: "READ"
        }
      });

      logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
      
      return {
        success: true,
        message: "Notification marked as read"
      };
    } catch (error) {
      logger.error(`Error marking notification as read: ${error}`);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    params: {
      type?: NotificationType;
      status?: NotificationStatus;
      isRead?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    notifications: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  }> {
    try {
      const { type, status, isRead, page = 1, limit = 20 } = params;
      const skip = (page - 1) * limit;

      const where: Prisma.NotificationWhereInput = { userId };

      if (type) where.type = type;
      if (status) where.status = status;
      if (isRead !== undefined) where.isRead = isRead;

      const [notifications, total, unreadCount] = await Promise.all([
        db.notification.findMany({
          where,
          skip,
          take: limit,
          include: {
            order: {
              select: {
                id: true,
                status: true,
                amount: true
              }
            },
            return: {
              select: {
                id: true,
                status: true,
                reason: true
              }
            },
            shipment: {
              select: {
                id: true,
                trackingNumber: true,
                status: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }),
        db.notification.count({ where }),
        db.notification.count({
          where: { userId, isRead: false }
        })
      ]);

      return {
        notifications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount
      };
    } catch (error) {
      logger.error(`Error getting user notifications: ${error}`);
      throw error;
    }
  }

  /**
   * Create notification template
   */
  static async createNotificationTemplate(template: NotificationTemplate): Promise<{ success: boolean; template: any; message: string }> {
    try {
      const notificationTemplate = await db.notificationTemplate.create({
        data: {
          type: template.type,
          title: template.title,
          message: template.message,
          priority: template.priority,
          variables: template.variables ? JSON.stringify(template.variables) : null
        }
      });

      logger.info(`Notification template created: ${template.type}`);
      
      return {
        success: true,
        template: notificationTemplate,
        message: "Notification template created successfully"
      };
    } catch (error) {
      logger.error(`Error creating notification template: ${error}`);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Array<{
      type: NotificationType;
      emailEnabled?: boolean;
      pushEnabled?: boolean;
      smsEnabled?: boolean;
      webSocketEnabled?: boolean;
    }>
  ): Promise<{ success: boolean; message: string }> {
    try {
      for (const pref of preferences) {
        await db.notificationPreference.upsert({
          where: {
            userId_type: {
              userId,
              type: pref.type
            }
          },
          update: {
            emailEnabled: pref.emailEnabled,
            pushEnabled: pref.pushEnabled,
            smsEnabled: pref.smsEnabled,
            webSocketEnabled: pref.webSocketEnabled
          },
          create: {
            userId,
            type: pref.type,
            emailEnabled: pref.emailEnabled ?? true,
            pushEnabled: pref.pushEnabled ?? true,
            smsEnabled: pref.smsEnabled ?? false,
            webSocketEnabled: pref.webSocketEnabled ?? true
          }
        });
      }

      logger.info(`Notification preferences updated for user ${userId}`);
      
      return {
        success: true,
        message: "Notification preferences updated successfully"
      };
    } catch (error) {
      logger.error(`Error updating notification preferences: ${error}`);
      throw error;
    }
  }

  /**
   * Get notification analytics
   */
  static async getNotificationAnalytics(params: {
    userId?: string;
    period?: "7d" | "30d" | "90d" | "1y";
    type?: NotificationType;
  }): Promise<any> {
    try {
      const { userId, period = "30d", type } = params;

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

      const where: Prisma.NotificationWhereInput = {
        createdAt: { gte: dateFrom }
      };

      if (userId) {
        where.userId = userId;
      }

      if (type) {
        where.type = type;
      }

      const [
        totalNotifications,
        notificationsByType,
        notificationsByStatus,
        notificationsByPriority,
        unreadCount,
        readCount
      ] = await Promise.all([
        db.notification.count({ where }),
        db.notification.groupBy({
          by: ["type"],
          where,
          _count: { type: true }
        }),
        db.notification.groupBy({
          by: ["status"],
          where,
          _count: { status: true }
        }),
        db.notification.groupBy({
          by: ["priority"],
          where,
          _count: { priority: true }
        }),
        db.notification.count({
          where: { ...where, isRead: false }
        }),
        db.notification.count({
          where: { ...where, isRead: true }
        })
      ]);

      return {
        summary: {
          totalNotifications,
          unreadCount,
          readCount,
          readRate: totalNotifications > 0 ? (readCount / totalNotifications) * 100 : 0
        },
        notificationsByType: notificationsByType.map(item => ({
          type: item.type,
          count: item._count.type
        })),
        notificationsByStatus: notificationsByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        notificationsByPriority: notificationsByPriority.map(item => ({
          priority: item.priority,
          count: item._count.priority
        }))
      };
    } catch (error) {
      logger.error(`Error getting notification analytics: ${error}`);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(): Promise<{ success: boolean; deletedCount: number }> {
    try {
      const result = await db.notification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      logger.info(`Cleaned up ${result.count} expired notifications`);
      
      return {
        success: true,
        deletedCount: result.count
      };
    } catch (error) {
      logger.error(`Error cleaning up expired notifications: ${error}`);
      throw error;
    }
  }

  /**
   * Retry failed notifications
   */
  static async retryFailedNotifications(): Promise<{ success: boolean; retriedCount: number }> {
    try {
      const failedNotifications = await db.notification.findMany({
        where: {
          status: "FAILED",
          retryCount: { lt: 3 } // Max 3 retries
        },
        take: 100 // Process in batches
      });

      let retriedCount = 0;

      for (const notification of failedNotifications) {
        try {
          await this.sendRealTimeNotification(notification);
          retriedCount++;
        } catch (error) {
          logger.error(`Failed to retry notification ${notification.id}: ${error}`);
        }
      }

      logger.info(`Retried ${retriedCount} failed notifications`);
      
      return {
        success: true,
        retriedCount
      };
    } catch (error) {
      logger.error(`Error retrying failed notifications: ${error}`);
      throw error;
    }
  }

  /**
   * Broadcast system-wide notification
   */
  static async broadcastSystemNotification(
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = "NORMAL",
    data?: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.io) {
        return { success: false, message: "Socket.IO server not initialized" };
      }

      // Broadcast to all connected users
      this.io.emit("system_notification", {
        type,
        title,
        message,
        priority,
        data,
        timestamp: new Date()
      });

      logger.info(`System notification broadcasted: ${type}`);
      
      return {
        success: true,
        message: "System notification broadcasted successfully"
      };
    } catch (error) {
      logger.error(`Error broadcasting system notification: ${error}`);
      throw error;
    }
  }

  /**
   * Get active WebSocket connections
   */
  static getActiveConnections(): WebSocketConnection[] {
    return Array.from(this.activeConnections.values());
  }

  /**
   * Get connection count
   */
  static getConnectionCount(): number {
    return this.activeConnections.size;
  }
}
