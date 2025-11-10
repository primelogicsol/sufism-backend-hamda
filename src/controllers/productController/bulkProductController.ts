import { PrismaClient, type Accessories, type Decoration, type DigitalBook, type Fashion, type HomeAndLiving, type Meditation } from "@prisma/client";
import fsp from "fs/promises";
import reshttp from "reshttp";
import { type _Request } from "../../middleware/authMiddleware.js";
import type { RowData, TCategory } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

const prisma = new PrismaClient();

interface BaseProductData {
  title: string;
  name: string | null;
  color: string | null;
  care: string | null;
  material: string | null;
  shippingTime: string | null;
  description: string | null;
  price: number;
  stock: number;
  sku: string;
  tags: string[];
  images: string[];
  weight?: number;
  dimensions?: string;
  shippingClass?: string;
}

const validCategories: TCategory[] = ["accessories", "decorations", "homeAndLiving", "fashion", "meditation", "digitalBooks"];

// Type-safe CSV parser using native fs
async function parseCsv(filePath: string): Promise<RowData[]> {
  try {
    const fileContent = await fsp.readFile(filePath, "utf8");
    const lines = fileContent.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      throw new Error("Empty CSV file");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows: RowData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const row: RowData = {};
      headers.forEach((header, index) => {
        if (values[index] !== undefined && values[index] !== "") {
          (row as Record<string, string>)[header] = values[index];
        }
      });
      rows.push(row);
    }

    return rows;
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${(error as Error).message}`);
  }
}

// Helper function to parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === "") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Helper function to safely parse comma-separated arrays
function parseCommaSeparatedArray(value: string | undefined): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// Create data for each category type
function createAccessoriesData(
  baseData: BaseProductData,
  userId: string
): Omit<Accessories, "id" | "createdAt" | "updatedAt" | "wishlist" | "cart" | "reviews"> {
  return {
    ...baseData,
    userId,
    isDelete: false,
    weight: baseData.weight || 0,
    dimensions: baseData.dimensions || "",
    shippingClass: baseData.shippingClass || "STANDARD"
  };
}

function createDecorationData(
  baseData: BaseProductData,
  userId: string
): Omit<Decoration, "id" | "createdAt" | "updatedAt" | "wishlist" | "cart" | "reviews"> {
  return {
    ...baseData,
    userId,
    isDelete: false,
    weight: baseData.weight || 0,
    dimensions: baseData.dimensions || "",
    shippingClass: baseData.shippingClass || "STANDARD"
  };
}

function createHomeAndLivingData(
  baseData: BaseProductData,
  userId: string
): Omit<HomeAndLiving, "id" | "createdAt" | "updatedAt" | "wishlist" | "cart" | "reviews"> {
  return {
    ...baseData,
    userId,
    isDelete: false,
    weight: baseData.weight || 0,
    dimensions: baseData.dimensions || "",
    shippingClass: baseData.shippingClass || "STANDARD"
  };
}

function createFashionData(
  baseData: BaseProductData,
  userId: string
): Omit<Fashion, "id" | "createdAt" | "updatedAt" | "wishlist" | "cart" | "reviews"> {
  return {
    ...baseData,
    userId,
    isDelete: false,
    weight: baseData.weight || 0,
    dimensions: baseData.dimensions || "",
    shippingClass: baseData.shippingClass || "STANDARD"
  };
}

function createMeditationData(
  baseData: BaseProductData,
  userId: string
): Omit<Meditation, "id" | "createdAt" | "updatedAt" | "wishlist" | "cart" | "reviews"> {
  return {
    ...baseData,
    userId,
    isDelete: false,
    weight: baseData.weight || 0,
    dimensions: baseData.dimensions || "",
    shippingClass: baseData.shippingClass || "STANDARD"
  };
}

function createDigitalBookData(row: RowData, userId: string): Omit<DigitalBook, "id" | "createdAt" | "updatedAt" | "wishlist" | "cart" | "reviews"> {
  const price = typeof row.price === "string" ? parseFloat(row.price) : row.price || 0;

  return {
    userId,
    title: row.title || "",
    description: row.descritpion ?? row.description ?? "",
    author: row.author ?? null,
    genre: row.genre ?? null,
    releaseDate: row.releaseDate && !isNaN(Date.parse(row.releaseDate)) ? new Date(row.releaseDate) : null,
    url: row.url ?? null,
    fileType: row.fileType ?? null,
    coverImage: row.coverImage ?? null,
    price,
    stock: typeof row.stock === "string" ? parseInt(row.stock) : row.stock || 0,
    overviewImages: parseCommaSeparatedArray(row.overviewImages),
    isAvailable: true,
    isDelete: false
  };
}

// POST /upload-bulk
export default {
  bulkProductUploader: asyncHandler(async (req: _Request, res) => {
    const categoryParam = typeof req.query.category === "string" ? (req.query.category.toLowerCase().replace(/\s+/g, "") as TCategory) : undefined;

    if (!categoryParam || !validCategories.includes(categoryParam)) {
      res.status(400).json({
        error: `Invalid or missing category. Must be one of: ${validCategories.join(", ")}`
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No CSV file uploaded" });
      return;
    }

    const filePath = req.file.path;

    try {
      const rows: RowData[] = await parseCsv(filePath);

      if (rows.length === 0) throw new Error("Empty CSV file");

      const normalizedRows: RowData[] = rows.map((row) =>
        Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase().trim(), typeof value === "string" ? value.trim() : value]))
      );

      // Debug: Log first row to help troubleshoot
      if (normalizedRows.length > 0) {
        logger.info(`First CSV row parsed: ${JSON.stringify(normalizedRows[0], null, 2)}`);
      }

      const errors: string[] = [];
      let insertedCount = 0;

      if (!req.userFromToken?.id) {
        httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
        return;
      }
      for (const [index, row] of normalizedRows.entries()) {
        // Special validation for digitalBooks (different required fields)
        if (categoryParam === "digitalBooks") {
          if (!row.title || row.price === undefined || (typeof row.price === "string" && isNaN(parseFloat(row.price)))) {
            errors.push(`Row ${index + 2}: Missing/invalid required fields for digitalBooks (title, price)`);
            continue;
          }
          // Always use the authenticated user's id
          row.userId = req.userFromToken.id;
        } else {
          // Validate required fields for other categories
          if (!row.title || !row.sku || row.price === undefined || (typeof row.price === "string" && isNaN(parseFloat(row.price)))) {
            errors.push(`Row ${index + 2}: Missing/invalid required fields (title, price, sku)`);
            continue;
          }
        }

        const price = typeof row.price === "string" ? parseFloat(row.price) : row.price;
        const stock = typeof row.stock === "string" ? parseInt(row.stock, 10) || 0 : row.stock || 0;

        const baseData: BaseProductData = {
          title: row.title,
          name: row.name ?? null,
          color: row.color ?? null,
          care: row.care ?? null,
          material: row.material ?? null,
          shippingTime: row.shippingtime ?? null,
          description: row.description ?? null,
          price,
          stock,
          sku: row.sku || "",
          tags: parseCommaSeparatedArray(row.tags),
          images: parseCommaSeparatedArray(row.images)
        };

        try {
          // Handle each category with proper typing
          switch (categoryParam) {
            case "accessories":
              await prisma.accessories.create({
                data: createAccessoriesData(baseData, req.userFromToken?.id)
              });
              insertedCount++;
              break;
            case "decorations":
              await prisma.decoration.create({
                data: createDecorationData(baseData, req.userFromToken?.id)
              });
              insertedCount++;
              break;
            case "homeAndLiving":
              await prisma.homeAndLiving.create({
                data: createHomeAndLivingData(baseData, req.userFromToken?.id)
              });
              insertedCount++;
              break;
            case "fashion":
              await prisma.fashion.create({
                data: createFashionData(baseData, req.userFromToken?.id)
              });
              insertedCount++;
              break;
            case "meditation":
              await prisma.meditation.create({
                data: createMeditationData(baseData, req.userFromToken?.id)
              });
              insertedCount++;
              break;
            case "digitalBooks":
              await prisma.digitalBook.create({
                data: createDigitalBookData(row, req.userFromToken?.id)
              });
              insertedCount++;
              break;
            default: {
              const exhaustiveCheck: never = categoryParam;
              throw new Error(`Unsupported category: ${String(exhaustiveCheck)}`);
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          if (errorMessage.includes("Unique constraint")) {
            if (categoryParam === "digitalBooks") {
              errors.push(`Row ${index + 2}: Digital book "${row.title}" already exists`);
            } else {
              errors.push(`Row ${index + 2}: SKU "${row.sku}" already exists`);
            }
          } else {
            errors.push(`Row ${index + 2}: Error inserting record - ${errorMessage}`);
          }
        }
      }

      await fsp.unlink(filePath).catch(() => {});
      return httpResponse(req, res, reshttp.okCode, `Processed ${categoryParam} CSV`, {
        totalRows: normalizedRows.length,
        inserted: insertedCount,
        errors: errors.length ? errors : null
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await fsp.unlink(filePath).catch(() => {});
      httpResponse(req, res, reshttp.internalServerErrorCode, errorMessage);
    }
  })
};
