import fs from "fs/promises";
import path from "path";
import { PrismaClient, ContentSection } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const ContentItemSchema = z.object({
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

interface SeederStats {
  totalFiles: number;
  successful: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

async function seedSection(sectionName: string, sectionPath: string, stats: SeederStats, category?: string): Promise<void> {
  try {
    const entries = await fs.readdir(sectionPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const entryPath = path.join(sectionPath, entry.name);

        // For academy-details, the first level directories are categories
        if (sectionName === "academy-details" && !category) {
          console.log(`  Processing category: ${entry.name}`);
          await seedSection(sectionName, entryPath, stats, entry.name);
          continue;
        }

        // This is a content item directory, look for version files
        const versionFiles = await fs.readdir(entryPath);
        const jsonFiles = versionFiles
          .filter((file) => file.startsWith("v") && file.endsWith(".json"))
          .sort((a, b) => {
            const versionA = parseInt(a.slice(1, -5));
            const versionB = parseInt(b.slice(1, -5));
            return versionA - versionB;
          });

        if (jsonFiles.length === 0) {
          continue;
        }

        // Process all versions for this content item
        const slug = entry.name;
        let contentId: string | null = null;

        console.log(`    Processing: ${slug} (${jsonFiles.length} version${jsonFiles.length > 1 ? "s" : ""})`);

        for (const jsonFile of jsonFiles) {
          const filePath = path.join(entryPath, jsonFile);
          stats.totalFiles++;

          try {
            const fileContent = await fs.readFile(filePath, "utf-8");
            const data: unknown = JSON.parse(fileContent);

            // Validate the data
            const validated = ContentItemSchema.parse(data);
            const versionNumber = parseInt(jsonFile.slice(1, -5)); // Extract version from filename

            const sectionEnum = toSectionEnum(validated.section);

            if (!contentId) {
              // Create the content record if it doesn't exist
              const existingContent = await prisma.content.findUnique({
                where: {
                  // eslint-disable-next-line camelcase
                  section_slug: {
                    section: sectionEnum,
                    slug: slug
                  }
                }
              });

              if (existingContent) {
                contentId = existingContent.id;
                console.log(`      Found existing content: ${contentId}`);
              } else {
                const newContent = await prisma.content.create({
                  data: {
                    section: sectionEnum,
                    slug: slug,
                    category: category,
                    currentVersion: versionNumber,
                    isPublished: true
                  }
                });
                contentId = newContent.id;
                console.log(`      Created content: ${contentId}`);
              }
            } else {
              // Update currentVersion if this version is higher
              await prisma.content.update({
                where: { id: contentId },
                data: {
                  currentVersion: {
                    set: versionNumber
                  }
                }
              });
            }

            // Create or update the version
            const existingVersion = await prisma.contentVersion.findUnique({
              where: {
                // eslint-disable-next-line camelcase
                contentId_version: {
                  contentId: contentId,
                  version: versionNumber
                }
              }
            });

            if (existingVersion) {
              await prisma.contentVersion.update({
                where: { id: existingVersion.id },
                data: {
                  title: validated.title,
                  subtitle: validated.subtitle,
                  parentPage: validated.parentPage,
                  cardTitle: validated.cardTitle,
                  heroImage: validated.heroImage,
                  seoTitle: validated.seo?.title,
                  seoDescription: validated.seo?.description,
                  seoKeywords: validated.seo?.keywords || [],
                  blocks: validated.blocks as Prisma.JsonArray
                }
              });
              console.log(`      Updated version ${versionNumber}`);
            } else {
              await prisma.contentVersion.create({
                data: {
                  contentId: contentId,
                  version: versionNumber,
                  title: validated.title,
                  subtitle: validated.subtitle,
                  parentPage: validated.parentPage,
                  cardTitle: validated.cardTitle,
                  heroImage: validated.heroImage,
                  seoTitle: validated.seo?.title,
                  seoDescription: validated.seo?.description,
                  seoKeywords: validated.seo?.keywords || [],
                  blocks: validated.blocks as Prisma.JsonArray
                }
              });
              console.log(`      Created version ${versionNumber}`);
            }

            stats.successful++;
          } catch (error) {
            stats.failed++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            stats.errors.push({ file: filePath, error: errorMsg });
            console.error(`      ❌ Error processing ${filePath}: ${errorMsg}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`  ❌ Error reading section ${sectionName}:`, error);
  }
}

async function main() {
  console.log("🚀 Starting content seeder...\n");

  const contentBasePath = process.env.CONTENT_BASE_PATH || path.resolve(process.cwd(), "content");
  const contentEnv = process.env.CONTENT_ENV || "prod";
  const contentPath = path.join(contentBasePath, contentEnv);

  console.log(`📁 Content path: ${contentPath}\n`);

  const stats: SeederStats = {
    totalFiles: 0,
    successful: 0,
    failed: 0,
    errors: []
  };

  // Seed each section
  const sections = ["explorer", "academy", "explorer-details", "academy-details"];

  for (const section of sections) {
    console.log(`\n📚 Processing section: ${section}`);
    const sectionPath = path.join(contentPath, section);

    try {
      await fs.access(sectionPath);
      await seedSection(section, sectionPath, stats);
    } catch {
      console.log(`  ⚠️  Section directory not found: ${sectionPath}`);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SEEDING SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total files processed: ${stats.totalFiles}`);
  console.log(`✅ Successful: ${stats.successful}`);
  console.log(`❌ Failed: ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log("\n🔍 Errors:");
    stats.errors.forEach(({ file, error }) => {
      console.log(`  - ${file}`);
      console.log(`    ${error}`);
    });
  }

  console.log("\n✨ Seeding complete!");
}

void main()
  .catch((error: Error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
