import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import fsp from "fs/promises";
import path from "path";
import { PrismaClient, type Accessories, type Decoration, type HomeAndLiving, type Fashion, type Meditation, type DigitalBook } from "@prisma/client";
import authMiddleware, { type _Request } from "../../middleware/authMiddleware.js";
import { uploadOnCloudinary } from "../../services/cloudinary.service.js";

export const uploadRouter: Router = Router();
const prisma = new PrismaClient();

// Multer configuration
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".csv") {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  }
});

// Multer for image uploads
const imageUpload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)"));
  }
});

// CSV row interface
interface RowData {
  title?: string;
  name?: string;
  color?: string;
  care?: string;
  material?: string;
  shippingtime?: string;
  description?: string;
  descritpion?: string; // schema typo - keeping for DigitalBook compatibility
  price?: string | number;
  stock?: string | number;
  sku?: string;
  tags?: string;
  images?: string;
  userId?: string;
  author?: string;
  genre?: string;
  releaseDate?: string;
  url?: string;
  fileType?: string;
  coverImage?: string;
  overviewImages?: string;
}

type Category = "accessories" | "decorations" | "homeAndLiving" | "fashion" | "meditation" | "digitalBooks";

const validCategories: Category[] = ["accessories", "decorations", "homeAndLiving", "fashion", "meditation", "digitalBooks"];

// Base data interface
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
}

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
    isDelete: false
  };
}

function createDecorationData(
  baseData: BaseProductData,
  userId: string
): Omit<Decoration, "id" | "createdAt" | "updatedAt" | "wishlist" | "cart" | "reviews"> {
  return {
    ...baseData,
    userId,
    isDelete: false
  };
}

function createHomeAndLivingData(
  baseData: BaseProductData,
  userId: string
): Omit<HomeAndLiving, "id" | "createdAt" | "updatedAt" | "wishlist" | "cart" | "reviews"> {
  return {
    ...baseData,
    userId,
    isDelete: false
  };
}

function createFashionData(
  baseData: BaseProductData,
  userId: string
): Omit<Fashion, "id" | "createdAt" | "updatedAt" | "wishlist" | "cart" | "reviews"> {
  return {
    ...baseData,
    userId,
    isDelete: false
  };
}

function createMeditationData(
  baseData: BaseProductData,
  userId: string
): Omit<Meditation, "id" | "createdAt" | "updatedAt" | "wishlist" | "cart" | "reviews"> {
  return {
    ...baseData,
    userId,
    isDelete: false
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
    overviewImages: parseCommaSeparatedArray(row.overviewImages),
    isAvailable: true,
    isDelete: false
  };
}

// POST /upload-bulk
uploadRouter.post("/upload-bulk", authMiddleware.checkToken, upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  const categoryParam = typeof req.query.category === "string" ? (req.query.category.toLowerCase().replace(/\s+/g, "") as Category) : undefined;

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
      console.log("First CSV row parsed:", JSON.stringify(normalizedRows[0], null, 2));
    }

    const errors: string[] = [];
    let insertedCount = 0;

    const userIdFromToken = (req as _Request).userFromToken?.id;
    if (!userIdFromToken) {
      res.status(401).json({ error: "Unauthorized" });
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
        row.userId = userIdFromToken;
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
              data: createAccessoriesData(baseData, userIdFromToken)
            });
            insertedCount++;
            break;
          case "decorations":
            await prisma.decoration.create({
              data: createDecorationData(baseData, userIdFromToken)
            });
            insertedCount++;
            break;
          case "homeAndLiving":
            await prisma.homeAndLiving.create({
              data: createHomeAndLivingData(baseData, userIdFromToken)
            });
            insertedCount++;
            break;
          case "fashion":
            await prisma.fashion.create({
              data: createFashionData(baseData, userIdFromToken)
            });
            insertedCount++;
            break;
          case "meditation":
            await prisma.meditation.create({
              data: createMeditationData(baseData, userIdFromToken)
            });
            insertedCount++;
            break;
          case "digitalBooks":
            await prisma.digitalBook.create({
              data: createDigitalBookData(row, userIdFromToken)
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

    res.status(200).json({
      message: `Processed ${categoryParam} CSV`,
      inserted: insertedCount,
      totalRows: normalizedRows.length,
      errors: errors.length ? errors : null
    });
  } catch (err) {
    await fsp.unlink(filePath).catch(() => {});
    res.status(500).json({ error: (err as Error).message });
  }
});

export default uploadRouter;

// POST /upload-image-by-sku
uploadRouter.post(
  "/upload-image-by-sku",
  authMiddleware.checkToken,
  imageUpload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const rawBody: unknown = req.body;
      const body = (typeof rawBody === "object" && rawBody !== null ? (rawBody as Record<string, unknown>) : {}) as {
        category?: unknown;
        sku?: unknown;
      };
      const categoryRaw = typeof body.category === "string" ? body.category : "";
      const category = categoryRaw.toLowerCase().replace(/\s+/g, "") as Category;
      const sku = typeof body.sku === "string" ? body.sku.trim() : "";

      const allowedForSku: Category[] = ["accessories", "decorations", "homeAndLiving", "fashion", "meditation"];

      if (!category || !allowedForSku.includes(category)) {
        res.status(400).json({ error: `Invalid or missing category. Must be one of: ${allowedForSku.join(", ")}` });
        return;
      }
      if (!sku) {
        res.status(400).json({ error: "Missing sku" });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: "No image file uploaded" });
        return;
      }

      // Locate record by SKU based on category
      let record: { id: number; images: string[] } | null = null;
      if (category === "accessories") {
        const item = await prisma.accessories.findUnique({ where: { sku } });
        record = item ? { id: item.id, images: item.images } : null;
      } else if (category === "decorations") {
        const item = await prisma.decoration.findUnique({ where: { sku } });
        record = item ? { id: item.id, images: item.images } : null;
      } else if (category === "homeAndLiving") {
        const item = await prisma.homeAndLiving.findUnique({ where: { sku } });
        record = item ? { id: item.id, images: item.images } : null;
      } else if (category === "fashion") {
        const item = await prisma.fashion.findUnique({ where: { sku } });
        record = item ? { id: item.id, images: item.images } : null;
      } else if (category === "meditation") {
        const item = await prisma.meditation.findUnique({ where: { sku } });
        record = item ? { id: item.id, images: item.images } : null;
      }

      if (!record) {
        await fsp.unlink(req.file.path).catch(() => {});
        res.status(404).json({ error: `No record found with sku ${sku}` });
        return;
      }

      if (Array.isArray(record.images) && record.images.length > 0) {
        await fsp.unlink(req.file.path).catch(() => {});
        res.status(400).json({ error: "Images already exist for this SKU" });
        return;
      }

      const ext = path.extname(req.file.originalname).replace(".", "").toLowerCase();
      const uploadResp = (await uploadOnCloudinary(req.file.path, sku, ext)) as { secure_url?: string; url?: string } | null;
      const uploadedUrl: string | null = uploadResp?.secure_url ?? uploadResp?.url ?? null;

      if (!uploadedUrl) {
        res.status(500).json({ error: "Upload failed" });
        return;
      }

      // Update the record with the new image URL
      if (category === "accessories") {
        await prisma.accessories.update({ where: { sku }, data: { images: { set: [uploadedUrl] } } });
      } else if (category === "decorations") {
        await prisma.decoration.update({ where: { sku }, data: { images: { set: [uploadedUrl] } } });
      } else if (category === "homeAndLiving") {
        await prisma.homeAndLiving.update({ where: { sku }, data: { images: { set: [uploadedUrl] } } });
      } else if (category === "fashion") {
        await prisma.fashion.update({ where: { sku }, data: { images: { set: [uploadedUrl] } } });
      } else if (category === "meditation") {
        await prisma.meditation.update({ where: { sku }, data: { images: { set: [uploadedUrl] } } });
      }

      res.status(200).json({ message: "Image uploaded and linked successfully", sku, image: uploadedUrl });
    } catch (err) {
      // uploadOnCloudinary deletes the temp file on success/failure; no need to unlink here
      res.status(500).json({ error: (err as Error).message });
    }
  }
);
