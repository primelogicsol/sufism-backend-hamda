import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SufiSaintJSON {
  name: string;
  dates_raw?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  period?: string | null;
  century?: string | null;
  summary: string;
  tags: string[];
}

interface JSONFile {
  collection: string;
  count: number;
  fields: string[];
  data: SufiSaintJSON[];
}

async function seedSufiSaints(): Promise<void> {
  console.log("🌟 Starting Sufi Saints seeder...\n");

  const jsonPath = path.join(__dirname, "../../data/sufi_saints.json");

  try {
    // Check if file exists
    try {
      await fs.access(jsonPath);
    } catch {
      console.error(`❌ File not found: ${jsonPath}`);
      console.log("\nPlease copy the sufi_saints.json file to:");
      console.log(`   ${path.join(__dirname, "../../data/")}\n`);
      return;
    }

    // Read JSON file
    const fileContent = await fs.readFile(jsonPath, "utf-8");
    const jsonData = JSON.parse(fileContent) as JSONFile;

    console.log(`📖 Found ${jsonData.count} saints in JSON file\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const saint of jsonData.data) {
      try {
        // Check if saint already exists (by name)
        const existing = await prisma.sufiSaint.findFirst({
          where: {
            name: saint.name
          }
        });

        if (existing) {
          // Update existing saint
          await prisma.sufiSaint.update({
            where: { id: existing.id },
            data: {
              datesRaw: saint.dates_raw ?? null,
              birthYear: saint.birth_year ?? null,
              deathYear: saint.death_year ?? null,
              period: saint.period ?? null,
              century: saint.century ?? null,
              summary: saint.summary,
              tags: saint.tags || [],
              isPublished: true
            }
          });
          updated++;
          console.log(`   ✓ Updated: ${saint.name}`);
        } else {
          // Create new saint
          await prisma.sufiSaint.create({
            data: {
              name: saint.name,
              datesRaw: saint.dates_raw ?? null,
              birthYear: saint.birth_year ?? null,
              deathYear: saint.death_year ?? null,
              period: saint.period ?? null,
              century: saint.century ?? null,
              summary: saint.summary,
              tags: saint.tags || [],
              isPublished: true
            }
          });
          created++;
          console.log(`   ✓ Created: ${saint.name}`);
        }
      } catch (error) {
        skipped++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`   ❌ Error processing ${saint.name}: ${errorMsg}`);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Seeding Summary:");
    console.log("=".repeat(50));
    console.log(`✅ Created:  ${created}`);
    console.log(`🔄 Updated:  ${updated}`);
    console.log(`⏭️  Skipped:  ${skipped}`);
    console.log(`📝 Total:    ${jsonData.data.length}`);
    console.log("=".repeat(50) + "\n");

    console.log("✨ Sufi Saints seeding completed successfully!\n");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error seeding Sufi Saints: ${errorMsg}\n`);
    throw error;
  }
}

void seedSufiSaints()
  .catch((error: Error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
