import type { ProductCategory } from "@prisma/client";
import { type Prisma } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import { getProductDetails } from "../../utils/getProductCategoryUtil.js";
import logger from "../../utils/loggerUtils.js";

export const purchaseController = {
  userPurchases: asyncHandler(async (req: _Request, res) => {
    const { category } = req.query;
    const userId = req.userFromToken?.id;

    // Check if user exists
    const user = await db.user.findFirst({
      where: { id: userId }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    try {
      const where: Prisma.OrderWhereInput = {
        userId: user.id
      };

      if (category) {
        where.items = {
          some: {
            category: category as ProductCategory
          }
        };
      }

      const purchasedItems = await db.order.findMany({
        where,
        include: {
          items: {
            include: {
              order: true
            }
          }
        }
      });

      const detailedItems = await Promise.all(
        purchasedItems.flatMap((order) =>
          order.items.map(async (item) => {
            const product = await getProductDetails(item.category, item.productId);

            return {
              orderId: order.id,
              orderStatus: order.status,
              paymentStatus: order.paymentStatus,
              orderCreatedAt: order.createdAt,
              item: {
                ...item,
                product
              }
            };
          })
        )
      );

      // Return the response with detailed items
      return httpResponse(req, res, reshttp.okCode, "Purchased items retrieved successfully", {
        orderItems: detailedItems
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error fetching purchased items: ${errorMessage}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to fetch purchased items");
    }
  })
};
