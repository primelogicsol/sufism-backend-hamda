import type { Accessories, Decoration, DigitalBook, Fashion, HomeAndLiving, Meditation, Music, Prisma } from "@prisma/client";
import { ProductCategory } from "@prisma/client";
import { db } from "../configs/database.js";

// Define a union type for the possible return types of getProductDetails
type ProductDetails = Music | DigitalBook | Meditation | Fashion | HomeAndLiving | Decoration | Accessories | null;

// Helper utility for fetching product details based on ProductCategory
export async function getProductDetails(category: ProductCategory, productId: number): Promise<ProductDetails> {
  // Define select fields with proper Prisma types
  const selectFields: Prisma.MeditationSelect = {
    id: true,
    title: true,
    price: true,
    images: true
  };

  try {
    switch (category) {
      case ProductCategory.MUSIC:
        return await db.music.findUnique({
          where: { id: productId },
          select: {
            ...selectFields,
            mp3Url: true,
            mp4Url: true
          }
        });

      case ProductCategory.DIGITAL_BOOK:
        return await db.digitalBook.findUnique({
          where: { id: productId },
          select: {
            ...selectFields,
            url: true,
            coverImage: true
          }
        });

      case ProductCategory.MEDITATION:
        return await db.meditation.findUnique({
          where: { id: productId },
          select: selectFields
        });

      case ProductCategory.FASHION:
        return await db.fashion.findUnique({
          where: { id: productId },
          select: selectFields
        });

      case ProductCategory.HOME_LIVING:
        return await db.homeAndLiving.findUnique({
          where: { id: productId },
          select: selectFields
        });

      case ProductCategory.DECORATION:
        return await db.decoration.findUnique({
          where: { id: productId },
          select: selectFields
        });

      case ProductCategory.ACCESSORIES:
        return await db.accessories.findUnique({
          where: { id: productId },
          select: selectFields
        });

      default:
        return null;
    }
  } catch (error: unknown) {
    throw new Error(`Failed to fetch product details for category ${category}: ${error as string}`);
  }
}
