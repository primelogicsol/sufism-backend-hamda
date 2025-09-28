// controllers/vendorOrderController.js
import { type OrderStatus, type Prisma, ProductCategory } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { SearchQuery } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

export default {
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

    const [accessories, fashion, music, digitalBooks, meditation, homeLiving, decoration] = await Promise.all([
      db.accessories.findMany({ where: { userId: targetVendorId }, select: { id: true } }),
      db.fashion.findMany({ where: { userId: targetVendorId }, select: { id: true } }),
      db.music.findMany({ where: { userId: targetVendorId }, select: { id: true } }),
      db.digitalBook.findMany({ where: { userId: targetVendorId }, select: { id: true } }),
      db.meditation.findMany({ where: { userId: targetVendorId }, select: { id: true } }),
      db.homeAndLiving.findMany({ where: { userId: targetVendorId }, select: { id: true } }),
      db.decoration.findMany({ where: { userId: targetVendorId }, select: { id: true } })
    ]);

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
        .map(([category, ids]) => ({ category: category as ProductCategory, productId: { in: ids } })),
      order: {
        paymentStatus: "PAID"
      }
    };

    if (status) {
      filters.status = status as OrderStatus;
    }
    if (startDate || endDate) {
      filters.order = {
        createdAt: {
          gte: startDate ? new Date(String(startDate)) : undefined,
          lte: endDate ? new Date(String(endDate)) : undefined
        }
      };
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
    }
  }),

  updateOrderItemStatus: asyncHandler(async (req: _Request, res) => {
    const { ids } = req.params; // can be "5" or "4,5,6"
    const { status } = req.body as { status: OrderStatus };

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

    // Fetch all order items
    const orderItems = await db.orderItem.findMany({
      where: { id: { in: idArray } }
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
      data: { status }
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

    // Find the order item
    const orderItem = await db.orderItem.findUnique({
      where: { id: Number(orderItemId) },
      include: {
        order: true // include parent order info
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

    // Get all product IDs for this vendor
    const [accessories, fashion, music, digitalBooks, meditation, homeLiving, decoration] = await Promise.all([
      db.accessories.findMany({ where: { userId: vendorId }, select: { id: true } }),
      db.fashion.findMany({ where: { userId: vendorId }, select: { id: true } }),
      db.music.findMany({ where: { userId: vendorId }, select: { id: true } }),
      db.digitalBook.findMany({ where: { userId: vendorId }, select: { id: true } }),
      db.meditation.findMany({ where: { userId: vendorId }, select: { id: true } }),
      db.homeAndLiving.findMany({ where: { userId: vendorId }, select: { id: true } }),
      db.decoration.findMany({ where: { userId: vendorId }, select: { id: true } })
    ]);

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
  })
};
