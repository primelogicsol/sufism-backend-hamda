/*
  Warnings:

  - Made the column `abstract` on table `conferences` required. This step will fail if there are existing NULL values in that column.
  - Made the column `topic` on table `conferences` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "conferences" ALTER COLUMN "abstract" SET NOT NULL,
ALTER COLUMN "presentationType" SET NOT NULL,
ALTER COLUMN "presentationType" SET DATA TYPE "PRESENTATION_TYPE",
ALTER COLUMN "topic" SET NOT NULL;
