import type { Request, Response } from "express";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  /**
   * Get all users (Admin JWT Auth)
   */
  getAllUsers: asyncHandler(async (req: Request, res: Response) => {
    const {
      page = "1",
      limit = "10",
      role,
      search,
      isVerified,
      isCompleted
    } = req.query as {
      page?: string;
      limit?: string;
      role?: string;
      search?: string;
      isVerified?: string;
      isCompleted?: string;
    };

    try {
      const where: Record<string, unknown> = {};

      if (role) {
        where.role = role;
      }

      if (isVerified !== undefined) {
        where.isVerified = isVerified === "true";
      }

      if (isCompleted !== undefined) {
        where.isCompleted = isCompleted === "true";
      }

      if (search) {
        where.OR = [
          { email: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } }
        ];
      }

      const take = Number(limit);
      const skip = (Number(page) - 1) * take;

      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
            isCompleted: true,
            vendoraccepted: true,
            createdAt: true,
            avatar: true
          },
          skip,
          take,
          orderBy: { createdAt: "desc" }
        }),
        db.user.count({ where })
      ]);

      return httpResponse(req, res, reshttp.okCode, "Users retrieved successfully", {
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / take)
        }
      });
    } catch (error) {
      logger.error(`Error getting users: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get users");
    }
  }),

  /**
   * Get user by ID (Admin JWT Auth)
   */
  getUserById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const user = await db.user.findUnique({
        where: { id },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isVerified: true,
          isCompleted: true,
          vendoraccepted: true,
          createdAt: true,
          avatar: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
          businessName: true,
          businessType: true
        }
      });

      if (!user) {
        return httpResponse(req, res, reshttp.notFoundCode, "User not found");
      }

      return httpResponse(req, res, reshttp.okCode, "User retrieved successfully", user);
    } catch (error) {
      logger.error(`Error getting user: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get user");
    }
  }),

  /**
   * Update user role (Admin JWT Auth)
   */
  updateUserRole: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body as { role: string };

    if (!role || !["user", "vendor", "admin"].includes(role)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Invalid role. Must be user, vendor, or admin");
    }

    try {
      const user = await db.user.findUnique({ where: { id } });
      if (!user) {
        return httpResponse(req, res, reshttp.notFoundCode, "User not found");
      }

      const updatedUser = await db.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true
        }
      });

      return httpResponse(req, res, reshttp.okCode, "User role updated successfully", updatedUser);
    } catch (error) {
      logger.error(`Error updating user role: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update user role");
    }
  }),

  /**
   * Update user verification status (Admin JWT Auth)
   */
  updateUserVerification: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isVerified } = req.body as { isVerified: boolean };

    try {
      const user = await db.user.findUnique({ where: { id } });
      if (!user) {
        return httpResponse(req, res, reshttp.notFoundCode, "User not found");
      }

      const updatedUser = await db.user.update({
        where: { id },
        data: { isVerified },
        select: {
          id: true,
          fullName: true,
          email: true,
          isVerified: true
        }
      });

      return httpResponse(req, res, reshttp.okCode, "User verification status updated successfully", updatedUser);
    } catch (error) {
      logger.error(`Error updating user verification: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update user verification");
    }
  }),

  /**
   * Delete user (Admin JWT Auth)
   */
  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const user = await db.user.findUnique({ where: { id } });
      if (!user) {
        return httpResponse(req, res, reshttp.notFoundCode, "User not found");
      }

      await db.user.delete({ where: { id } });

      return httpResponse(req, res, reshttp.okCode, "User deleted successfully");
    } catch (error) {
      logger.error(`Error deleting user: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to delete user");
    }
  }),

  /**
   * Get user statistics (Admin JWT Auth)
   */
  getUserStats: asyncHandler(async (req: Request, res: Response) => {
    try {
      const [totalUsers, verifiedUsers, vendors, admins, recentUsers] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { isVerified: true } }),
        db.user.count({ where: { role: "vendor" } }),
        db.user.count({ where: { role: "admin" } }),
        db.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        })
      ]);

      return httpResponse(req, res, reshttp.okCode, "User statistics retrieved successfully", {
        totalUsers,
        verifiedUsers,
        vendors,
        admins,
        recentUsers,
        verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0
      });
    } catch (error) {
      logger.error(`Error getting user statistics: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get user statistics");
    }
  })
};
