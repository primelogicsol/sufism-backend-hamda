/*
  Warnings:

  - Made the column `abstract` on table `conferences` required. This step will fail if there are existing NULL values in that column.
  - Made the column `topic` on table `conferences` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "conferences"
  ALTER COLUMN "abstract" SET NOT NULL,
  -- First convert from enum[] to enum by taking the first element and defaulting to 'ORAL'
  ALTER COLUMN "presentationType" SET DATA TYPE "PRESENTATION_TYPE" USING COALESCE("presentationType"[1], 'ORAL'::"PRESENTATION_TYPE"),
  -- Now enforce NOT NULL after conversion
  ALTER COLUMN "presentationType" SET NOT NULL,
  ALTER COLUMN "topic" SET NOT NULL;
