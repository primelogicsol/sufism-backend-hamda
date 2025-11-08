import { z } from "zod";
import { PrismaClient, ContentSection } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import logger from "../utils/loggerUtils.js";

const prisma = new PrismaClient();

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

// Helper function to convert section string to enum
function toSectionEnum(section: string): ContentSection {
  switch (section) {
    case "explorer":
      return ContentSection.explorer;
    case "academy":
      return ContentSection.academy;
    case "explorer-details":
      return ContentSection.explorer_details;
    case "academy-details":
      return ContentSection.academy_details;
    default:
      throw new Error(`Invalid section: ${section}`);
  }
}

// Helper function to convert section enum to string
function fromSectionEnum(section: ContentSection): string {
  switch (section) {
    case ContentSection.explorer:
      return "explorer";
    case ContentSection.academy:
      return "academy";
    case ContentSection.explorer_details:
      return "explorer-details";
    case ContentSection.academy_details:
      return "academy-details";
  }
}

export class ContentService {
  /**
   * Get list of content items for a section
   */
  static async getList(section: string): Promise<unknown> {
    try {
      const sectionEnum = toSectionEnum(section);
      const items = await prisma.content.findMany({
        where: {
          section: sectionEnum,
          isPublished: true
        },
        select: {
          slug: true,
          category: true,
          currentVersion: true,
          updatedAt: true,
          versions: {
            select: {
              version: true,
              title: true,
              subtitle: true,
              heroImage: true
            }
          }
        }
      });

      // Transform to match old index format
      return {
        items: items
          .map((item) => {
            // Get the current version's data
            const currentVersionData = item.versions.find((v) => v.version === item.currentVersion) || item.versions[0];
            return {
              slug: item.slug,
              title: currentVersionData?.title || "",
              category: item.category,
              path: `prod/${section}/${item.category ? `${item.category}/` : ""}${item.slug}/v1.json` // Legacy path for compatibility
            };
          })
          .sort((a, b) => a.title.localeCompare(b.title))
      };
    } catch (error) {
      logger.error("content.getList", { section, error: String(error) });
      throw new Error(`Failed to get content list for section: ${section}`);
    }
  }

  /**
   * Get latest version of a content item
   */
  static async getItem(section: string, slug: string): Promise<ContentItem> {
    try {
      const sectionEnum = toSectionEnum(section);

      const content = await prisma.content.findUnique({
        where: {
          // eslint-disable-next-line camelcase
          section_slug: {
            section: sectionEnum,
            slug: slug
          }
        },
        include: {
          versions: true
        }
      });

      if (!content || content.versions.length === 0) {
        throw new Error(`Content not found: ${section}/${slug}`);
      }

      // Get the current version explicitly
      const latestVersion = content.versions.find((v) => v.version === content.currentVersion);

      if (!latestVersion) {
        // Fallback: get the highest version number if currentVersion is inconsistent
        const sortedVersions = content.versions.sort((a, b) => b.version - a.version);
        const fallbackVersion = sortedVersions[0];
        logger.warn("content.getItem", {
          section,
          slug,
          currentVersion: content.currentVersion,
          fallbackVersion: fallbackVersion.version,
          message: "currentVersion mismatch, using highest version"
        });
        return this.buildContentItem(content, fallbackVersion);
      }

      return this.buildContentItem(content, latestVersion);
    } catch (error) {
      logger.error("content.getItem", { section, slug, error: String(error) });
      throw error;
    }
  }

  /**
   * Helper method to build ContentItem response
   */
  private static buildContentItem(
    content: {
      id: string;
      section: ContentSection;
      slug: string;
      category: string | null;
      updatedAt: Date;
    },
    version: {
      title: string;
      subtitle: string | null;
      parentPage: string | null;
      cardTitle: string | null;
      heroImage: string | null;
      seoTitle: string | null;
      seoDescription: string | null;
      seoKeywords: string[];
      blocks: Prisma.JsonValue;
      version: number;
    }
  ): ContentItem {
    const sectionString = fromSectionEnum(content.section) as "explorer" | "academy" | "explorer-details" | "academy-details";
    return {
      id: content.id,
      section: sectionString,
      slug: content.slug,
      title: version.title,
      subtitle: version.subtitle || undefined,
      parentPage: version.parentPage || undefined,
      cardTitle: version.cardTitle || undefined,
      heroImage: version.heroImage || undefined,
      category: content.category || undefined,
      seo:
        version.seoTitle || version.seoDescription || version.seoKeywords.length > 0
          ? {
              title: version.seoTitle || undefined,
              description: version.seoDescription || undefined,
              keywords: version.seoKeywords.length > 0 ? version.seoKeywords : undefined
            }
          : undefined,
      blocks: version.blocks as Prisma.JsonArray,
      version: version.version,
      updatedAt: content.updatedAt.toISOString()
    };
  }

  /**
   * Get a specific version of a content item
   */
  static async getItemByVersion(section: string, slug: string, version: number): Promise<ContentItem> {
    try {
      const sectionEnum = toSectionEnum(section);

      const content = await prisma.content.findUnique({
        where: {
          // eslint-disable-next-line camelcase
          section_slug: {
            section: sectionEnum,
            slug: slug
          }
        },
        include: {
          versions: {
            where: {
              version: version
            }
          }
        }
      });

      if (!content || content.versions.length === 0) {
        throw new Error(`Content version not found: ${section}/${slug}/v${version}`);
      }

      const contentVersion = content.versions[0];
      return this.buildContentItem(content, contentVersion);
    } catch (error) {
      logger.error("content.getItemByVersion", { section, slug, version, error: String(error) });
      throw error;
    }
  }

  /**
   * Get available versions for a content item
   */
  static async getAvailableVersions(section: string, slug: string): Promise<number[]> {
    try {
      const sectionEnum = toSectionEnum(section);

      const content = await prisma.content.findUnique({
        where: {
          // eslint-disable-next-line camelcase
          section_slug: {
            section: sectionEnum,
            slug: slug
          }
        },
        include: {
          versions: {
            select: {
              version: true
            },
            orderBy: {
              version: "asc"
            }
          }
        }
      });

      if (!content) {
        logger.warn("content.getAvailableVersions", { section, slug, error: "Content not found" });
        return [];
      }

      return content.versions.map((v) => v.version);
    } catch (error) {
      logger.warn("content.getAvailableVersions", { section, slug, error: String(error) });
      return [];
    }
  }

  /**
   * Create or update a content item (creates new version)
   */
  static async upsertItem(section: string, slug: string, payload: unknown): Promise<ContentItem> {
    try {
      const parsed = ContentItemSchema.parse(payload);

      if (parsed.section !== section || parsed.slug !== slug) {
        throw new Error("section/slug mismatch between URL and body");
      }

      const sectionEnum = toSectionEnum(section);
      const now = new Date();

      // Check if content already exists
      const existing = await prisma.content.findUnique({
        where: {
          // eslint-disable-next-line camelcase
          section_slug: {
            section: sectionEnum,
            slug: slug
          }
        },
        include: {
          versions: {
            orderBy: {
              version: "desc"
            },
            take: 1
          }
        }
      });

      let content;
      let newVersion: number;

      if (existing) {
        // Update existing content and create new version
        newVersion = existing.currentVersion + 1;

        content = await prisma.content.update({
          where: { id: existing.id },
          data: {
            category: parsed.category,
            currentVersion: newVersion,
            updatedAt: now,
            versions: {
              create: {
                version: newVersion,
                title: parsed.title,
                subtitle: parsed.subtitle,
                parentPage: parsed.parentPage,
                cardTitle: parsed.cardTitle,
                heroImage: parsed.heroImage,
                seoTitle: parsed.seo?.title,
                seoDescription: parsed.seo?.description,
                seoKeywords: parsed.seo?.keywords || [],
                blocks: parsed.blocks as Prisma.JsonArray,
                createdAt: now
              }
            }
          },
          include: {
            versions: {
              where: {
                version: newVersion
              }
            }
          }
        });
      } else {
        // Create new content with initial version
        newVersion = 1;

        content = await prisma.content.create({
          data: {
            section: sectionEnum,
            slug: slug,
            category: parsed.category,
            currentVersion: 1,
            isPublished: true,
            versions: {
              create: {
                version: 1,
                title: parsed.title,
                subtitle: parsed.subtitle,
                parentPage: parsed.parentPage,
                cardTitle: parsed.cardTitle,
                heroImage: parsed.heroImage,
                seoTitle: parsed.seo?.title,
                seoDescription: parsed.seo?.description,
                seoKeywords: parsed.seo?.keywords || [],
                blocks: parsed.blocks as Prisma.JsonArray,
                createdAt: now
              }
            }
          },
          include: {
            versions: {
              where: {
                version: 1
              }
            }
          }
        });
      }

      logger.info("content.upsert", {
        section,
        slug,
        version: newVersion,
        contentId: content.id
      });

      // Return the content item using the helper
      return this.buildContentItem(content, content.versions[0]);
    } catch (error) {
      logger.error("content.upsertItem", { section, slug, error: String(error) });
      throw error;
    }
  }
}
