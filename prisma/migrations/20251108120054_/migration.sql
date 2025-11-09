-- CreateTable for Sufi Saints
CREATE TABLE "public"."sufi_saints" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "dates_raw" TEXT,
    "birth_year" INTEGER,
    "death_year" INTEGER,
    "period" TEXT,
    "century" TEXT,
    "summary" TEXT NOT NULL,
    "tags" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sufi_saints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sufi_saints_period_idx" ON "public"."sufi_saints"("period");

-- CreateIndex
CREATE INDEX "sufi_saints_century_idx" ON "public"."sufi_saints"("century");

-- CreateIndex
CREATE INDEX "sufi_saints_isPublished_idx" ON "public"."sufi_saints"("isPublished");
