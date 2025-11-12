/*
  Warnings:

  - The `donorType` column on the `donations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `image` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `products` table. All the data in the column will be lost.
  - The `category` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `comment` on the `reviews` table. All the data in the column will be lost.
  - Added the required column `review` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum (with existence checks)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CONFERENCE_TYPE') THEN
        CREATE TYPE "CONFERENCE_TYPE" AS ENUM ('SUFI_PHILOSOPHY', 'QUANTUM_CONSCIOUSNESS', 'MYSTICAL_PRACTICES', 'HEALING_TRANSITIONS', 'INTER_APPROACHES', 'OTHER');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PRESENTATION_TYPE') THEN
        CREATE TYPE "PRESENTATION_TYPE" AS ENUM ('ORAL', 'POSTER', 'WORKSHOP', 'PANEL_DISCUSSION');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DONATION_TYPE') THEN
        CREATE TYPE "DONATION_TYPE" AS ENUM ('ONE_TIME', 'MONTHLY', 'GENERAL_DONATIONS', 'SPONSORSHIP_DONATIONS', 'PATRON_MEMBERSHIP_CONTRIBUTIONS', 'EDUCATIONAL_SCHOLARSHIP_DONATIONS', 'LEGACY_PLANNED_GIVING', 'RECURRING');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CATEGORY_TYPE') THEN
        CREATE TYPE "CATEGORY_TYPE" AS ENUM ('JWELERY_ACCESSPORIES', 'ART_WALL_CONTROL', 'HOME_WALLDECOR', 'FASION_UPRAISEL', 'WELLNESS_MEDITAION', 'DIGITAL_BOOKS', 'AUDIO_SPECTRUM');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'STATUS_TYPE') THEN
        CREATE TYPE "STATUS_TYPE" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SERVICE_TYPE') THEN
        CREATE TYPE "SERVICE_TYPE" AS ENUM ('ASSIST_WITH_SPRITUAL_PROGRAM', 'SUPPORT_CRAFT_CULTURE', 'FUND_RAISING_EVENT_ORGANIZATION', 'OUTREACH_COMMUNITY', 'HELP_DIGITAL_MEDIA', 'CREATE_SACRED_ART_HANDICRAFTS');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SPRITUAL_TYPE') THEN
        CREATE TYPE "SPRITUAL_TYPE" AS ENUM ('SUFI', 'FREETHINKER', 'NOT_AFFLIATED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'INTERVIEW_INTENT_TYPE') THEN
        CREATE TYPE "INTERVIEW_INTENT_TYPE" AS ENUM ('INSPIRING_OTHERS', 'SHARE_KNOWLEDGE', 'NETWORK', 'PROMOTE_WORK', 'DOCUMENT_EXPERIENCE', 'SPIRITUAL_DIALOGUE');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'INTERVIEW_TIME_ZONE') THEN
        CREATE TYPE "INTERVIEW_TIME_ZONE" AS ENUM ('MYSTIC', 'SCIENTIFIC', 'ACADEMIC');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IMPACT_TYPE') THEN
        CREATE TYPE "IMPACT_TYPE" AS ENUM ('SPRITUAL_LEADERSHIP', 'INTEGRATIVE_HEALTH', 'SCIENTIFIC_CONCIOUSNESS', 'ECO_STEWARD', 'POLICY_REFORM', 'TRANS_EDUCATIVE', 'ETHICAL_JUSTICE', 'CULTURAL_EXPRESSION', 'UNITY_DIALOGUE', 'YOUTH_EMPOWERMENT');
    END IF;
END $$;

-- DropForeignKey (with existence check)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_userId_fkey'
    ) THEN
        ALTER TABLE "products" DROP CONSTRAINT "products_userId_fkey";
    END IF;
END $$;

-- DropIndex (with existence check)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'products_userId_key'
    ) THEN
        DROP INDEX "products_userId_key";
    END IF;
END $$;

-- AlterTable
ALTER TABLE "donations" DROP COLUMN "donorType",
ADD COLUMN     "donorType" "DONATION_TYPE" NOT NULL DEFAULT 'ONE_TIME';

-- AlterTable
ALTER TABLE "products" DROP COLUMN "image",
DROP COLUMN "userId",
ADD COLUMN     "deliveryTime" TEXT,
ADD COLUMN     "discount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "note" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "returnPolicy" TEXT,
ADD COLUMN     "tags" TEXT[],
DROP COLUMN "category",
ADD COLUMN     "category" "CATEGORY_TYPE" NOT NULL DEFAULT 'JWELERY_ACCESSPORIES';

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "comment",
ADD COLUMN     "review" TEXT NOT NULL,
ADD COLUMN     "status" "STATUS_TYPE" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zipCode" TEXT,
ALTER COLUMN "fullName" SET DEFAULT '';

-- DropEnum (with existence check)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DONATIONTYPE') THEN
        DROP TYPE "DONATIONTYPE";
    END IF;
END $$;

-- CreateTable
CREATE TABLE "conferences" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "institution" TEXT,
    "abstract" TEXT,
    "presentationType" "PRESENTATION_TYPE"[],
    "topic" "CONFERENCE_TYPE",
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookServices" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "service" "SERVICE_TYPE" NOT NULL DEFAULT 'ASSIST_WITH_SPRITUAL_PROGRAM',
    "comment" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookServices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "website" TEXT,
    "areasOfImpact" "IMPACT_TYPE"[] DEFAULT ARRAY['SPRITUAL_LEADERSHIP']::"IMPACT_TYPE"[],
    "spiritualOrientation" "SPRITUAL_TYPE",
    "publicVoice" BOOLEAN NOT NULL,
    "interviewIntent" "INTERVIEW_INTENT_TYPE"[],
    "status" INTEGER NOT NULL DEFAULT 0,
    "interviewTimeZone" "INTERVIEW_TIME_ZONE",
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactUs" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contactUs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conferences_userId_key" ON "conferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_userId_productId_key" ON "wishlists"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "bookServices_userId_key" ON "bookServices"("userId");

-- AddForeignKey
ALTER TABLE "conferences" ADD CONSTRAINT "conferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookServices" ADD CONSTRAINT "bookServices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactUs" ADD CONSTRAINT "contactUs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
