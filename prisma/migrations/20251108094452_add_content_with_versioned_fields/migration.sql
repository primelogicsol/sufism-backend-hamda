-- CreateEnum
CREATE TYPE "public"."ContentSection" AS ENUM ('explorer', 'academy', 'explorer_details', 'academy_details');

-- CreateTable
CREATE TABLE "public"."content" (
    "id" TEXT NOT NULL,
    "section" "public"."ContentSection" NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_versions" (
    "id" SERIAL NOT NULL,
    "contentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "parentPage" TEXT,
    "cardTitle" TEXT,
    "heroImage" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[],
    "blocks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_section_idx" ON "public"."content"("section");

-- CreateIndex
CREATE INDEX "content_slug_idx" ON "public"."content"("slug");

-- CreateIndex
CREATE INDEX "content_category_idx" ON "public"."content"("category");

-- CreateIndex
CREATE UNIQUE INDEX "content_section_slug_key" ON "public"."content"("section", "slug");

-- CreateIndex
CREATE INDEX "content_versions_contentId_idx" ON "public"."content_versions"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_contentId_version_key" ON "public"."content_versions"("contentId", "version");

-- AddForeignKey
ALTER TABLE "public"."content_versions" ADD CONSTRAINT "content_versions_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "public"."content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
