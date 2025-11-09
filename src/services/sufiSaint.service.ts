import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import logger from "../utils/loggerUtils.js";

const prisma = new PrismaClient();

// Zod schema for validation
export const SufiSaintSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  datesRaw: z.string().nullable().optional(),
  birthYear: z.number().nullable().optional(),
  deathYear: z.number().nullable().optional(),
  period: z.string().nullable().optional(),
  century: z.string().nullable().optional(),
  summary: z.string().min(1, "Summary is required"),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(true)
});

export type SufiSaintInput = z.infer<typeof SufiSaintSchema>;

export interface SufiSaintListResponse {
  collection: string;
  count: number;
  fields: string[];
  data: SufiSaintData[];
}

export interface SufiSaintData {
  id: number;
  name: string;
  dates_raw: string | null;
  birth_year: number | null;
  death_year: number | null;
  period: string | null;
  century: string | null;
  summary: string;
  tags: string[];
}

export class SufiSaintService {
  /**
   * Get all Sufi Saints with optional filters
   */
  static async getAll(filters?: { period?: string; century?: string; tag?: string; search?: string }): Promise<SufiSaintListResponse> {
    try {
      const where: {
        isPublished: boolean;
        period?: string;
        century?: string;
        tags?: { has: string };
        OR?: Array<{
          name?: { contains: string; mode: "insensitive" };
          summary?: { contains: string; mode: "insensitive" };
        }>;
      } = {
        isPublished: true
      };

      if (filters?.period) {
        where.period = filters.period;
      }

      if (filters?.century) {
        where.century = filters.century;
      }

      if (filters?.tag) {
        where.tags = {
          has: filters.tag
        };
      }

      if (filters?.search) {
        where.OR = [{ name: { contains: filters.search, mode: "insensitive" } }, { summary: { contains: filters.search, mode: "insensitive" } }];
      }

      const saints = await prisma.sufiSaint.findMany({
        where,
        orderBy: [{ birthYear: "asc" }, { name: "asc" }]
      });

      return {
        collection: "Kashmir Sufi Legacy",
        count: saints.length,
        fields: ["name", "dates_raw", "birth_year", "death_year", "period", "century", "summary", "tags"],
        data: saints.map((saint) => ({
          id: saint.id,
          name: saint.name,
          // eslint-disable-next-line camelcase
          dates_raw: saint.datesRaw,
          // eslint-disable-next-line camelcase
          birth_year: saint.birthYear,
          // eslint-disable-next-line camelcase
          death_year: saint.deathYear,
          period: saint.period,
          century: saint.century,
          summary: saint.summary,
          tags: saint.tags
        }))
      };
    } catch (error) {
      logger.error("sufiSaint.getAll", { error: String(error) });
      throw new Error("Failed to fetch Sufi Saints");
    }
  }

  /**
   * Get a single Sufi Saint by ID
   */
  static async getById(id: number): Promise<SufiSaintData | null> {
    try {
      const saint = await prisma.sufiSaint.findUnique({
        where: { id }
      });

      if (!saint) {
        return null;
      }

      return {
        id: saint.id,
        name: saint.name,
        // eslint-disable-next-line camelcase
        dates_raw: saint.datesRaw,
        // eslint-disable-next-line camelcase
        birth_year: saint.birthYear,
        // eslint-disable-next-line camelcase
        death_year: saint.deathYear,
        period: saint.period,
        century: saint.century,
        summary: saint.summary,
        tags: saint.tags
      };
    } catch (error) {
      logger.error("sufiSaint.getById", { id, error: String(error) });
      throw error;
    }
  }

  /**
   * Create a new Sufi Saint
   */
  static async create(data: SufiSaintInput): Promise<SufiSaintData> {
    try {
      const validated = SufiSaintSchema.parse(data);

      const saint = await prisma.sufiSaint.create({
        data: {
          name: validated.name,
          datesRaw: validated.datesRaw ?? null,
          birthYear: validated.birthYear ?? null,
          deathYear: validated.deathYear ?? null,
          period: validated.period ?? null,
          century: validated.century ?? null,
          summary: validated.summary,
          tags: validated.tags,
          isPublished: validated.isPublished
        }
      });

      logger.info("sufiSaint.create", { id: saint.id, name: saint.name });

      return {
        id: saint.id,
        name: saint.name,
        // eslint-disable-next-line camelcase
        dates_raw: saint.datesRaw,
        // eslint-disable-next-line camelcase
        birth_year: saint.birthYear,
        // eslint-disable-next-line camelcase
        death_year: saint.deathYear,
        period: saint.period,
        century: saint.century,
        summary: saint.summary,
        tags: saint.tags
      };
    } catch (error) {
      logger.error("sufiSaint.create", { error: String(error) });
      throw error;
    }
  }

  /**
   * Update a Sufi Saint
   */
  static async update(id: number, data: Partial<SufiSaintInput>): Promise<SufiSaintData> {
    try {
      const saint = await prisma.sufiSaint.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.datesRaw !== undefined && { datesRaw: data.datesRaw }),
          ...(data.birthYear !== undefined && { birthYear: data.birthYear }),
          ...(data.deathYear !== undefined && { deathYear: data.deathYear }),
          ...(data.period !== undefined && { period: data.period }),
          ...(data.century !== undefined && { century: data.century }),
          ...(data.summary !== undefined && { summary: data.summary }),
          ...(data.tags !== undefined && { tags: data.tags }),
          ...(data.isPublished !== undefined && { isPublished: data.isPublished })
        }
      });

      logger.info("sufiSaint.update", { id: saint.id, name: saint.name });

      return {
        id: saint.id,
        name: saint.name,
        // eslint-disable-next-line camelcase
        dates_raw: saint.datesRaw,
        // eslint-disable-next-line camelcase
        birth_year: saint.birthYear,
        // eslint-disable-next-line camelcase
        death_year: saint.deathYear,
        period: saint.period,
        century: saint.century,
        summary: saint.summary,
        tags: saint.tags
      };
    } catch (error) {
      logger.error("sufiSaint.update", { id, error: String(error) });
      throw error;
    }
  }

  /**
   * Delete a Sufi Saint
   */
  static async delete(id: number): Promise<void> {
    try {
      await prisma.sufiSaint.delete({
        where: { id }
      });

      logger.info("sufiSaint.delete", { id });
    } catch (error) {
      logger.error("sufiSaint.delete", { id, error: String(error) });
      throw error;
    }
  }

  /**
   * Get unique periods
   */
  static async getPeriods(): Promise<string[]> {
    try {
      const results = await prisma.sufiSaint.findMany({
        where: {
          period: {
            not: null
          }
        },
        select: {
          period: true
        },
        distinct: ["period"]
      });

      return results
        .map((r) => r.period)
        .filter((p): p is string => p !== null)
        .sort();
    } catch (error) {
      logger.error("sufiSaint.getPeriods", { error: String(error) });
      return [];
    }
  }

  /**
   * Get unique centuries
   */
  static async getCenturies(): Promise<string[]> {
    try {
      const results = await prisma.sufiSaint.findMany({
        where: {
          century: {
            not: null
          }
        },
        select: {
          century: true
        },
        distinct: ["century"]
      });

      return results
        .map((r) => r.century)
        .filter((c): c is string => c !== null)
        .sort();
    } catch (error) {
      logger.error("sufiSaint.getCenturies", { error: String(error) });
      return [];
    }
  }

  /**
   * Get all unique tags
   */
  static async getTags(): Promise<string[]> {
    try {
      const saints = await prisma.sufiSaint.findMany({
        select: {
          tags: true
        }
      });

      const allTags = new Set<string>();
      saints.forEach((saint) => {
        saint.tags.forEach((tag) => allTags.add(tag));
      });

      return Array.from(allTags).sort();
    } catch (error) {
      logger.error("sufiSaint.getTags", { error: String(error) });
      return [];
    }
  }
}
