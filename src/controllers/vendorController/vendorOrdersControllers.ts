// controllers/vendorOrderController.js
import { type OrderItemStatus, type Prisma, ProductCategory } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { SearchQuery } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  // Get all orders for the authenticated vendor (simplified)
  getAllVendorOrders: asyncHandler(async (req: _Request, res) => {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate
    } = req.query as {
      page?: string;
      limit?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    };

    const vendorId = req.userFromToken?.id;
    if (!vendorId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Get vendor's products from all categories - using sequential queries to avoid connection pool exhaustion
    const accessories = await db.accessories.findMany({ where: { userId: vendorId }, select: { id: true } });
    const fashion = await db.fashion.findMany({ where: { userId: vendorId }, select: { id: true } });
    const music = await db.music.findMany({ where: { userId: vendorId }, select: { id: true } });
    const digitalBooks = await db.digitalBook.findMany({ where: { userId: vendorId }, select: { id: true } });
    const meditation = await db.meditation.findMany({ where: { userId: vendorId }, select: { id: true } });
    const homeLiving = await db.homeAndLiving.findMany({ where: { userId: vendorId }, select: { id: true } });
    const decoration = await db.decoration.findMany({ where: { userId: vendorId }, select: { id: true } });

    const productIdsByCategory = {
      ACCESSORIES: accessories.map((p) => p.id),
      FASHION: fashion.map((p) => p.id),
      MUSIC: music.map((p) => p.id),
      DIGITAL_BOOK: digitalBooks.map((p) => p.id),
      MEDITATION: meditation.map((p) => p.id),
      HOME_LIVING: homeLiving.map((p) => p.id),
      DECORATION: decoration.map((p) => p.id)
    };

    const orderFilter: Prisma.OrderWhereInput = {
      paymentStatus: "PAID"
    };

    if (startDate || endDate) {
      orderFilter.createdAt = {};
      if (startDate) {
        orderFilter.createdAt.gte = new Date(String(startDate));
      }
      if (endDate) {
        orderFilter.createdAt.lte = new Date(String(endDate));
      }
    }

    const filters: Prisma.OrderItemWhereInput = {
      OR: Object.entries(productIdsByCategory)
        .filter(([, ids]) => ids.length > 0)
        .map(([category, ids]) => ({ category: category as ProductCategory, productId: { in: ids } })),
      order: orderFilter
    };

    if (status) {
      const validStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];
      if (validStatuses.includes(status)) {
        filters.status = status as OrderItemStatus;
      }
    }

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const [orderItems, total] = await Promise.all([
      db.orderItem.findMany({
        where: filters,
        select: {
          id: true,
          orderId: true,
          category: true,
          productId: true,
          quantity: true,
          price: true,
          status: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              amount: true,
              status: true,
              paymentStatus: true,
              fullName: true,
              email: true,
              phone: true,
              shippingAddress: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        },
        skip,
        take,
        orderBy: { createdAt: "desc" }
      }),
      db.orderItem.count({ where: filters })
    ]);

    return httpResponse(req, res, reshttp.okCode, "Vendor orders retrieved successfully", {
      orders: orderItems,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / take)
      }
    });
  }),

  // Get all orders for a vendor
  getVendorOrders: asyncHandler(async (req: _Request, res) => {
    const { id: vendorId } = req.params;
    const { page = 1, limit = 10, status, startDate, endDate, search } = req.query as SearchQuery;

    const verifyUser = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!verifyUser) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    let targetVendorId = vendorId;
    if (verifyUser.role === "admin" && search) {
      const vendor = await db.user.findFirst({
        where: {
          OR: [
            { email: { contains: String(search), mode: "insensitive" } },
            { fullName: { contains: String(search), mode: "insensitive" } },
            { phone: { contains: String(search), mode: "insensitive" } }
          ]
        }
      });

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      targetVendorId = vendor.id;
    }

    // Get vendor's products from all categories - using sequential queries to avoid connection pool exhaustion
    const accessories = await db.accessories.findMany({ where: { userId: targetVendorId }, select: { id: true } });
    const fashion = await db.fashion.findMany({ where: { userId: targetVendorId }, select: { id: true } });
    const music = await db.music.findMany({ where: { userId: targetVendorId }, select: { id: true } });
    const digitalBooks = await db.digitalBook.findMany({ where: { userId: targetVendorId }, select: { id: true } });
    const meditation = await db.meditation.findMany({ where: { userId: targetVendorId }, select: { id: true } });
    const homeLiving = await db.homeAndLiving.findMany({ where: { userId: targetVendorId }, select: { id: true } });
    const decoration = await db.decoration.findMany({ where: { userId: targetVendorId }, select: { id: true } });

    const productIdsByCategory = {
      ACCESSORIES: accessories.map((p) => p.id),
      FASHION: fashion.map((p) => p.id),
      MUSIC: music.map((p) => p.id),
      DIGITAL_BOOK: digitalBooks.map((p) => p.id),
      MEDITATION: meditation.map((p) => p.id),
      HOME_LIVING: homeLiving.map((p) => p.id),
      DECORATION: decoration.map((p) => p.id)
    };
    const orderFilter: Prisma.OrderWhereInput = {
      paymentStatus: "PAID"
    };

    if (startDate || endDate) {
      orderFilter.createdAt = {};
      if (startDate) {
        orderFilter.createdAt.gte = new Date(String(startDate));
      }
      if (endDate) {
        orderFilter.createdAt.lte = new Date(String(endDate));
      }
    }

    const filters: Prisma.OrderItemWhereInput = {
      OR: Object.entries(productIdsByCategory)
        .filter(([, ids]) => ids.length)
        .map(([category, ids]) => ({ category: category as ProductCategory, productId: { in: ids } })),
      order: orderFilter
    };

    if (status) {
      const validStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];
      if (validStatuses.includes(status)) {
        filters.status = status as OrderItemStatus;
      }
    }

    // ✅ Pagination
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const [orderItems, total] = await Promise.all([
      db.orderItem.findMany({
        where: filters,
        include: { order: true },
        skip,
        take,
        orderBy: { createdAt: "desc" }
      }),
      db.orderItem.count({ where: filters })
    ]);

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
      orderItems,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / take)
      }
    });
  }),

  updateOrderItemStatus: asyncHandler(async (req: _Request, res) => {
    const { ids } = req.params; // can be "5" or "4,5,6"
    const { status } = req.body as { status: string };

    // Validate status
    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "IN_TRANSIT",
      "DELIVERED",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "RETURNED",
      "REFUNDED"
    ];
    if (!validStatuses.includes(status)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Invalid status provided");
    }

    const user = await db.user.findFirst({ where: { id: req.userFromToken?.id } });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Convert ids param into array of numbers
    const idArray = ids
      .split(",")
      .map((id) => Number(id.trim()))
      .filter(Boolean);

    if (!idArray.length) {
      return httpResponse(req, res, reshttp.badRequestCode, "No valid order item IDs provided");
    }

    // Fetch all order items with selective fields
    const orderItems = await db.orderItem.findMany({
      where: { id: { in: idArray } },
      select: {
        id: true,
        orderId: true,
        category: true,
        productId: true,
        quantity: true,
        price: true,
        status: true,
        createdAt: true
      }
    });

    if (!orderItems.length) {
      return httpResponse(req, res, reshttp.notFoundCode, "No matching order items found");
    }

    // ✅ Ownership check for each item
    for (const orderItem of orderItems) {
      let productOwner = null;
      switch (orderItem.category) {
        case ProductCategory.ACCESSORIES:
          productOwner = await db.accessories.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.FASHION:
          productOwner = await db.fashion.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.MUSIC:
          productOwner = await db.music.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.DIGITAL_BOOK:
          productOwner = await db.digitalBook.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.MEDITATION:
          productOwner = await db.meditation.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.HOME_LIVING:
          productOwner = await db.homeAndLiving.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.DECORATION:
          productOwner = await db.decoration.findUnique({ where: { id: orderItem.productId } });
          break;
      }

      if (!productOwner || productOwner.userId !== user.id) {
        return httpResponse(req, res, reshttp.unauthorizedCode, "Unauthorized to update some items");
      }
    }

    // ✅ Update all in one go
    const updated = await db.orderItem.updateMany({
      where: { id: { in: idArray } },
      data: { status: status as OrderItemStatus }
    });

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
      updatedCount: updated.count,
      ids: idArray,
      newStatus: status
    });
  }),
  // Get details of a single order item
  getOrderItemDetail: asyncHandler(async (req: _Request, res) => {
    const { orderItemId } = req.params;

    const user = await db.user.findFirst({ where: { id: req.userFromToken?.id } });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      // Find the order item with selective fields
      const orderItem = await db.orderItem.findUnique({
        where: { id: Number(orderItemId) },
        select: {
          id: true,
          orderId: true,
          category: true,
          productId: true,
          quantity: true,
          price: true,
          status: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              amount: true,
              status: true,
              paymentStatus: true,
              fullName: true,
              email: true,
              phone: true,
              shippingAddress: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        }
      });

      if (!orderItem) {
        return httpResponse(req, res, reshttp.notFoundCode, "Order item not found");
      }

      // Validate ownership: vendors should only see their own product items
      let productOwner = null;
      switch (orderItem.category) {
        case ProductCategory.ACCESSORIES:
          productOwner = await db.accessories.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.FASHION:
          productOwner = await db.fashion.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.MUSIC:
          productOwner = await db.music.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.DIGITAL_BOOK:
          productOwner = await db.digitalBook.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.MEDITATION:
          productOwner = await db.meditation.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.HOME_LIVING:
          productOwner = await db.homeAndLiving.findUnique({ where: { id: orderItem.productId } });
          break;
        case ProductCategory.DECORATION:
          productOwner = await db.decoration.findUnique({ where: { id: orderItem.productId } });
          break;
      }

      if (user.role === "vendor" && (!productOwner || productOwner.userId !== user.id)) {
        return httpResponse(req, res, reshttp.unauthorizedCode, "Unauthorized to view this order item");
      }

      return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, orderItem);
    } catch (error) {
      logger.error(`Error getting order item detail: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get order item detail");
    }
  }),

  // Get vendor order stats
  getVendorOrderStats: asyncHandler(async (req: _Request, res) => {
    const { id: vendorId } = req.params;

    const user = await db.user.findFirst({ where: { id: req.userFromToken?.id } });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // ✅ If vendor → they can only view their own stats
    // ✅ If admin → they can request stats for any vendor (via :id param)
    if (user.role === "vendor" && user.id !== vendorId) {
      return httpResponse(req, res, reshttp.unauthorizedCode, "Unauthorized to view other vendor stats");
    }

    try {
      // Get all product IDs for this vendor - using sequential queries to avoid connection pool exhaustion
      const accessories = await db.accessories.findMany({ where: { userId: vendorId }, select: { id: true } });
      const fashion = await db.fashion.findMany({ where: { userId: vendorId }, select: { id: true } });
      const music = await db.music.findMany({ where: { userId: vendorId }, select: { id: true } });
      const digitalBooks = await db.digitalBook.findMany({ where: { userId: vendorId }, select: { id: true } });
      const meditation = await db.meditation.findMany({ where: { userId: vendorId }, select: { id: true } });
      const homeLiving = await db.homeAndLiving.findMany({ where: { userId: vendorId }, select: { id: true } });
      const decoration = await db.decoration.findMany({ where: { userId: vendorId }, select: { id: true } });

      const productIdsByCategory = {
        ACCESSORIES: accessories.map((p) => p.id),
        FASHION: fashion.map((p) => p.id),
        MUSIC: music.map((p) => p.id),
        DIGITAL_BOOK: digitalBooks.map((p) => p.id),
        MEDITATION: meditation.map((p) => p.id),
        HOME_LIVING: homeLiving.map((p) => p.id),
        DECORATION: decoration.map((p) => p.id)
      };

      const filters: Prisma.OrderItemWhereInput = {
        OR: Object.entries(productIdsByCategory)
          .filter(([, ids]) => ids.length)
          .map(([category, ids]) => ({
            category: category as ProductCategory,
            productId: { in: ids }
          }))
      };

      // If no products found, return empty stats
      if (Object.values(productIdsByCategory).every((ids) => ids.length === 0)) {
        return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
          totalOrders: 0,
          ordersByStatus: [],
          totalRevenue: 0
        });
      }

      // ✅ Count by status
      const groupedByStatus = await db.orderItem.groupBy({
        by: ["status"],
        _count: { status: true },
        where: filters
      });

      // ✅ Total count
      const totalOrders = await db.orderItem.count({ where: filters });

      // ✅ Revenue (if you store price * quantity on orderItem)
      const revenue = await db.orderItem.aggregate({
        _sum: { price: true }, // adjust field name if different
        where: filters
      });

      return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
        totalOrders,
        ordersByStatus: groupedByStatus,
        totalRevenue: revenue._sum.price || 0
      });
    } catch (error) {
      logger.error(`Error getting vendor order stats: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor order stats");
    }
  })
};
