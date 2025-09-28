import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { mkdirSync } from "fs";
import { s3Get, s3Put } from "./storage/s3.storage.js";
import logger from "../utils/loggerUtils.js";

export const ContentItemSchema = z.object({
  id: z.string(),
  section: z.enum(["explorer", "academy", "explorer-details", "academy-details"]),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  parentPage: z.string().optional(),
  cardTitle: z.string().optional(),
  heroImage: z.string().url().optional(),
  category: z.string().optional(),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.array(z.string()).optional()
    })
    .optional(),
  blocks: z.array(z.any()),
  version: z.number().default(1),
  updatedAt: z.string()
});

export type ContentItem = z.infer<typeof ContentItemSchema>;

const DEFAULT_ENV = process.env.CONTENT_ENV || "prod";
const DEFAULT_BASE = process.env.CONTENT_BASE_PATH || path.resolve(process.cwd(), "content");
const USE_S3 = Boolean(process.env.S3_BUCKET && process.env.S3_REGION);
const S3_PREFIX = process.env.S3_PREFIX || DEFAULT_ENV;

export class ContentService {
  static getIndexPath(section: string) {
    if (USE_S3) return `${S3_PREFIX}/index/${section}.json`;
    return path.join(DEFAULT_BASE, DEFAULT_ENV, "index", `${section}.json`);
  }

  static getItemPath(section: string, slug: string, version = 1) {
    if (USE_S3) return `${S3_PREFIX}/${section}/${slug}/v${version}.json`;

    // Special handling for academy-details section with nested directory structure
    if (section === "academy-details" && slug.includes("/")) {
      return path.join(DEFAULT_BASE, DEFAULT_ENV, section, slug, `v${version}.json`);
    }

    return path.join(DEFAULT_BASE, DEFAULT_ENV, section, slug, `v${version}.json`);
  }

  static async getList(section: string): Promise<unknown> {
    const filePath = this.getIndexPath(section);
    let raw: string;
    if (USE_S3) {
      try {
        raw = await s3Get(filePath);
      } catch {
        // Fallback to local content if S3 object missing
        raw = await fs.readFile(path.join(DEFAULT_BASE, DEFAULT_ENV, "index", `${section}.json`), "utf-8");
      }
    } else {
      raw = await fs.readFile(filePath, "utf-8");
    }
    const data: unknown = JSON.parse(raw);
    return data;
  }

  static async getItem(section: string, slug: string): Promise<ContentItem> {
    // Special handling for academy-details section
    if (section === "academy-details") {
      // Look up the category from the index file
      const indexData = (await this.getList(section)) as { items: Array<{ slug: string; category: string; path: string }> };
      const item = indexData.items.find((item) => item.slug === slug);

      if (!item) {
        throw new Error(`Academy detail item with slug '${slug}' not found`);
      }

      // Extract category from the path or use the category field
      const category = item.category;
      const fullSlug = `${category}/${slug}`;

      // Use the nested directory structure
      const baseDir = path.join(DEFAULT_BASE, DEFAULT_ENV, section, category, slug);
      let latestVersion = 1;

      try {
        const files = await fs.readdir(baseDir);
        const versionFiles = files
          .filter((file) => file.startsWith("v") && file.endsWith(".json"))
          .map((file) => {
            const version = parseInt(file.slice(1, -5)); // Remove 'v' and '.json'
            return isNaN(version) ? 0 : version;
          })
          .filter((version) => version > 0);

        if (versionFiles.length > 0) {
          latestVersion = Math.max(...versionFiles);
        }
      } catch (error) {
        // If directory doesn't exist or can't be read, fall back to version 1
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn("content.getItem.versionDetection", { section, slug: fullSlug, error: errorMessage });
      }

      return this.getItemByVersion(section, fullSlug, latestVersion);
    }

    // Regular handling for other sections
    const baseDir = path.join(DEFAULT_BASE, DEFAULT_ENV, section, slug);
    let latestVersion = 1;

    try {
      const files = await fs.readdir(baseDir);
      const versionFiles = files
        .filter((file) => file.startsWith("v") && file.endsWith(".json"))
        .map((file) => {
          const version = parseInt(file.slice(1, -5)); // Remove 'v' and '.json'
          return isNaN(version) ? 0 : version;
        })
        .filter((version) => version > 0);

      if (versionFiles.length > 0) {
        latestVersion = Math.max(...versionFiles);
      }
    } catch (error) {
      // If directory doesn't exist or can't be read, fall back to version 1
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("content.getItem.versionDetection", { section, slug, error: errorMessage });
    }

    return this.getItemByVersion(section, slug, latestVersion);
  }

  static async getItemByVersion(section: string, slug: string, version: number): Promise<ContentItem> {
    const filePath = this.getItemPath(section, slug, version);
    let raw: string;
    if (USE_S3) {
      try {
        raw = await s3Get(filePath);
      } catch {
        // Fallback to local content if S3 object missing
        raw = await fs.readFile(path.join(DEFAULT_BASE, DEFAULT_ENV, section, slug, `v${version}.json`), "utf-8");
      }
    } else {
      raw = await fs.readFile(filePath, "utf-8");
    }
    const parsed: unknown = JSON.parse(raw);
    return ContentItemSchema.parse(parsed);
  }

  static async getAvailableVersions(section: string, slug: string): Promise<number[]> {
    let baseDir: string;

    // Special handling for academy-details section
    if (section === "academy-details") {
      // Look up the category from the index file
      const indexData = (await this.getList(section)) as { items: Array<{ slug: string; category: string; path: string }> };
      const item = indexData.items.find((item) => item.slug === slug);

      if (!item) {
        logger.warn("content.getAvailableVersions", { section, slug, error: "Item not found in index" });
        return [];
      }

      const category = item.category;
      baseDir = path.join(DEFAULT_BASE, DEFAULT_ENV, section, category, slug);
    } else {
      baseDir = path.join(DEFAULT_BASE, DEFAULT_ENV, section, slug);
    }

    try {
      const files = await fs.readdir(baseDir);
      const versionFiles = files
        .filter((file) => file.startsWith("v") && file.endsWith(".json"))
        .map((file) => {
          const version = parseInt(file.slice(1, -5)); // Remove 'v' and '.json'
          return isNaN(version) ? 0 : version;
        })
        .filter((version) => version > 0)
        .sort((a, b) => a - b); // Sort versions in ascending order

      return versionFiles;
    } catch (error) {
      logger.warn("content.getAvailableVersions", { section, slug, error: String(error) });
      return [];
    }
  }

  static async upsertItem(section: string, slug: string, payload: unknown): Promise<ContentItem> {
    const parsed = ContentItemSchema.parse(payload);
    if (parsed.section !== section || parsed.slug !== slug) {
      throw new Error("section/slug mismatch between URL and body");
    }
    const version = parsed.version ?? 1;
    const toWrite: ContentItem = { ...parsed, updatedAt: new Date().toISOString() };

    // Determine the actual file path based on section
    let actualSlug = slug;
    let localFilePath: string;
    let s3Key: string;

    if (section === "academy-details") {
      // For academy-details, we need to get the category from the payload or index
      const category = parsed.category;
      if (!category) {
        throw new Error("Category is required for academy-details items");
      }
      actualSlug = `${category}/${slug}`;
      localFilePath = path.join(DEFAULT_BASE, DEFAULT_ENV, section, category, slug, `v${version}.json`);
      s3Key = `${S3_PREFIX}/${section}/${actualSlug}/v${version}.json`;
    } else {
      localFilePath = path.join(DEFAULT_BASE, DEFAULT_ENV, section, slug, `v${version}.json`);
      s3Key = `${S3_PREFIX}/${section}/${slug}/v${version}.json`;
    }

    const body = JSON.stringify(toWrite, null, 2);
    // Always attempt to write to S3 when configured
    if (USE_S3) {
      await s3Put(s3Key, body);
      logger.info("content.upsert.s3", { key: s3Key });
    }
    // Always write to local as source-of-truth fallback
    const dir = path.dirname(localFilePath);
    mkdirSync(dir, { recursive: true });
    await fs.writeFile(localFilePath, body, "utf-8");
    logger.info("content.upsert.local", { path: localFilePath });
    // Ensure index entry exists/updated so lists reflect new content
    await this.ensureIndexEntry(section, slug, toWrite.title, version, parsed.category);
    return toWrite;
  }

  private static async readIndex(section: string): Promise<{ items: { slug: string; title?: string; path: string; category?: string }[] }> {
    const indexPath = this.getIndexPath(section);
    let raw: string | null = null;
    if (USE_S3) {
      try {
        raw = await s3Get(indexPath);
      } catch {
        // ignore and fall back to local
      }
    }
    if (!raw) {
      try {
        raw = await fs.readFile(indexPath, "utf-8");
      } catch {
        // Initialize empty index if not found locally
        return { items: [] };
      }
    }
    try {
      const IndexSchema = z.object({
        items: z.array(z.object({ slug: z.string(), title: z.string().optional(), path: z.string(), category: z.string().optional() })).default([])
      });
      const json: unknown = JSON.parse(raw);
      const parsed = IndexSchema.safeParse(json);
      if (parsed.success) {
        return { items: parsed.data.items };
      }
      return { items: [] };
    } catch {
      return { items: [] };
    }
  }

  private static async writeIndex(section: string, index: { items: { slug: string; title?: string; path: string; category?: string }[] }) {
    const body = JSON.stringify(index, null, 2);
    const indexLocalPath = this.getIndexPath(section);
    // Write to S3 if configured
    if (USE_S3) {
      const indexS3Key = `${S3_PREFIX}/index/${section}.json`;
      await s3Put(indexS3Key, body);
      logger.info("index.write.s3", { key: indexS3Key });
    }
    // Always write locally
    const localDir = path.dirname(indexLocalPath);
    mkdirSync(localDir, { recursive: true });
    await fs.writeFile(indexLocalPath, body, "utf-8");
    logger.info("index.write.local", { path: indexLocalPath });
  }

  private static async ensureIndexEntry(section: string, slug: string, title: string, version: number, category?: string) {
    logger.info("index.ensure.start", { section, slug, title, version, category });
    const index = await this.readIndex(section);

    let relPath: string;
    let entry: { slug: string; title: string; path: string; category?: string };

    if (section === "academy-details") {
      // For academy-details, we need the category from the payload
      if (!category) {
        throw new Error("Category is required for academy-details index entries");
      }
      relPath = `${DEFAULT_ENV}/${section}/${category}/${slug}/v${version}.json`;
      entry = { slug, title, path: relPath, category };
    } else {
      relPath = `${DEFAULT_ENV}/${section}/${slug}/v${version}.json`;
      entry = { slug, title, path: relPath };
    }

    const existingIdx = index.items.findIndex((it) => it.slug === slug);
    if (existingIdx >= 0) {
      index.items[existingIdx] = entry;
    } else {
      index.items.push(entry);
    }
    await this.writeIndex(section, index);
    logger.info("index.ensure.done", { section, count: index.items.length });
  }

  static async reindex(section?: "explorer" | "academy" | "academy-details"): Promise<void> {
    const sections: ("explorer" | "academy" | "academy-details")[] = section ? [section] : ["explorer", "academy", "academy-details"];
    for (const sec of sections) {
      if (sec === "academy-details") {
        // Special handling for academy-details with nested directory structure
        const baseDir = path.join(DEFAULT_BASE, DEFAULT_ENV, sec);
        const items: { slug: string; title?: string; path: string; category: string }[] = [];

        try {
          const categoryDirs = await fs.readdir(baseDir, { withFileTypes: true });
          const categories = categoryDirs.filter((e) => e.isDirectory()).map((e) => e.name);

          for (const category of categories) {
            const categoryDir = path.join(baseDir, category);
            try {
              const itemDirs = await fs.readdir(categoryDir, { withFileTypes: true });
              const itemsInCategory = itemDirs.filter((e) => e.isDirectory()).map((e) => e.name);

              for (const itemSlug of itemsInCategory) {
                const p = path.join(categoryDir, itemSlug, `v1.json`);
                try {
                  const raw = await fs.readFile(p, "utf-8");
                  const parsed = ContentItemSchema.safeParse(JSON.parse(raw));
                  items.push({
                    slug: itemSlug,
                    title: parsed.success ? parsed.data.title : itemSlug,
                    path: `${DEFAULT_ENV}/${sec}/${category}/${itemSlug}/v1.json`,
                    category: category
                  });
                } catch {
                  // skip
                }
              }
            } catch {
              // skip category
            }
          }
        } catch {
          // skip if base directory doesn't exist
        }

        await this.writeIndex(sec, { items });
      } else {
        // Regular handling for other sections
        const baseDir = path.join(DEFAULT_BASE, DEFAULT_ENV, sec);
        let slugs: string[] = [];
        try {
          const entries = await fs.readdir(baseDir, { withFileTypes: true });
          slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
        } catch {
          slugs = [];
        }
        const items: { slug: string; title?: string; path: string }[] = [];
        for (const s of slugs) {
          const p = path.join(baseDir, s, `v1.json`);
          try {
            const raw = await fs.readFile(p, "utf-8");
            const parsed = ContentItemSchema.safeParse(JSON.parse(raw));
            items.push({ slug: s, title: parsed.success ? parsed.data.title : s, path: `${DEFAULT_ENV}/${sec}/${s}/v1.json` });
          } catch {
            // skip
          }
        }
        await this.writeIndex(sec, { items });
      }
    }
  }
}

