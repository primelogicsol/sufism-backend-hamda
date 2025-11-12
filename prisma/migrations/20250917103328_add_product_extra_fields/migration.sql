/*
  Warnings:

  - You are about to drop the column `productId` on the `carts` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `review` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `wishlists` table. All the data in the column will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `interviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `content` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum (with existence checks)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionStatus') THEN
        CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductCategory') THEN
        CREATE TYPE "ProductCategory" AS ENUM ('MUSIC', 'DIGITAL_BOOK', 'MEDITATION', 'FASHION', 'HOME_LIVING', 'DECORATION', 'ACCESSORIES');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChecklistSection') THEN
        CREATE TYPE "ChecklistSection" AS ENUM ('INITIAL_ORIENTATION', 'FINDING_GUIDANCE', 'PRACTICE_AND_DISCIPLINE', 'COMMUNITY_ENGAGEMENT', 'ADVANCED_STUDY');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChecklistItemStatus') THEN
        CREATE TYPE "ChecklistItemStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SUFI_PATH_STATUS') THEN
        CREATE TYPE "SUFI_PATH_STATUS" AS ENUM ('THRESHOLD', 'EXPLORATION', 'ADVANCING', 'DEEPENING');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CouponType') THEN
        CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CouponStatus') THEN
        CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiscountScope') THEN
        CREATE TYPE "DiscountScope" AS ENUM ('ORDER', 'ITEM');
    END IF;
END $$;

-- DropForeignKey (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_productId_fkey') THEN
        ALTER TABLE "carts" DROP CONSTRAINT "carts_productId_fkey";
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_productId_fkey') THEN
        ALTER TABLE "reviews" DROP CONSTRAINT "reviews_productId_fkey";
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_productId_fkey') THEN
        ALTER TABLE "wishlists" DROP CONSTRAINT "wishlists_productId_fkey";
    END IF;
END $$;

-- DropIndex (with existence check)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'wishlists_userId_productId_key') THEN
        DROP INDEX "wishlists_userId_productId_key";
    END IF;
END $$;

-- AlterTable (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'carts') THEN
        -- Drop column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'productId') THEN
            ALTER TABLE "carts" DROP COLUMN "productId";
        END IF;
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'accessoriesId') THEN
            ALTER TABLE "carts" ADD COLUMN "accessoriesId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'bookId') THEN
            ALTER TABLE "carts" ADD COLUMN "bookId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'decorationId') THEN
            ALTER TABLE "carts" ADD COLUMN "decorationId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'fashionId') THEN
            ALTER TABLE "carts" ADD COLUMN "fashionId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'livingId') THEN
            ALTER TABLE "carts" ADD COLUMN "livingId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'meditationId') THEN
            ALTER TABLE "carts" ADD COLUMN "meditationId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'musicId') THEN
            ALTER TABLE "carts" ADD COLUMN "musicId" INTEGER;
        END IF;
    END IF;
END $$;

-- AlterTable (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conferences') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conferences' AND column_name = 'presentationType') THEN
            ALTER TABLE "conferences" ALTER COLUMN "presentationType" SET DEFAULT 'ORAL';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conferences' AND column_name = 'topic') THEN
            ALTER TABLE "conferences" ALTER COLUMN "topic" SET DEFAULT 'SUFI_PHILOSOPHY';
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interviews') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'interviews' AND column_name = 'acceptedByWho') THEN
            ALTER TABLE "interviews" ADD COLUMN "acceptedByWho" TEXT;
        END IF;
    END IF;
END $$;

-- AlterTable (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
        -- Drop columns if they exist
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'productId') THEN
            ALTER TABLE "reviews" DROP COLUMN "productId";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'review') THEN
            ALTER TABLE "reviews" DROP COLUMN "review";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'status') THEN
            ALTER TABLE "reviews" DROP COLUMN "status";
        END IF;
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'accessoriesId') THEN
            ALTER TABLE "reviews" ADD COLUMN "accessoriesId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'bookId') THEN
            ALTER TABLE "reviews" ADD COLUMN "bookId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'content') THEN
            -- Handle NOT NULL column - add with default first
            ALTER TABLE "reviews" ADD COLUMN "content" TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'decorationId') THEN
            ALTER TABLE "reviews" ADD COLUMN "decorationId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'fashionId') THEN
            ALTER TABLE "reviews" ADD COLUMN "fashionId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'livingId') THEN
            ALTER TABLE "reviews" ADD COLUMN "livingId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'meditationId') THEN
            ALTER TABLE "reviews" ADD COLUMN "meditationId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'musicId') THEN
            ALTER TABLE "reviews" ADD COLUMN "musicId" INTEGER;
        END IF;
    END IF;
END $$;

-- AlterTable (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'customer_id') THEN
            ALTER TABLE "users" ADD COLUMN "customer_id" TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
            ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
        END IF;
    END IF;
END $$;

-- AlterTable (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlists') THEN
        -- Drop column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'productId') THEN
            ALTER TABLE "wishlists" DROP COLUMN "productId";
        END IF;
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'accessoriesId') THEN
            ALTER TABLE "wishlists" ADD COLUMN "accessoriesId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'bookId') THEN
            ALTER TABLE "wishlists" ADD COLUMN "bookId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'decorationId') THEN
            ALTER TABLE "wishlists" ADD COLUMN "decorationId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'fashionId') THEN
            ALTER TABLE "wishlists" ADD COLUMN "fashionId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'livingId') THEN
            ALTER TABLE "wishlists" ADD COLUMN "livingId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'meditationId') THEN
            ALTER TABLE "wishlists" ADD COLUMN "meditationId" INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'musicId') THEN
            ALTER TABLE "wishlists" ADD COLUMN "musicId" INTEGER;
        END IF;
    END IF;
END $$;

-- DropTable (with existence check)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        DROP TABLE "products";
    END IF;
END $$;

-- DropEnum (with existence check)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CATEGORY_TYPE') THEN
        DROP TYPE "CATEGORY_TYPE";
    END IF;
END $$;

-- CreateTable (with existence checks)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        CREATE TABLE "orders" (
            "id" SERIAL NOT NULL,
            "userId" TEXT NOT NULL,
            "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
            "amount" DOUBLE PRECISION NOT NULL,
            "stripeSessionId" TEXT,
            "stripePaymentId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Transaction') THEN
        CREATE TABLE "Transaction" (
            "id" SERIAL NOT NULL,
            "orderId" INTEGER NOT NULL,
            "amount" DOUBLE PRECISION NOT NULL,
            "status" "TransactionStatus" NOT NULL,
            "paymentMethod" TEXT NOT NULL,
            "stripePaymentIntentId" TEXT,
            "stripeClientSecret" TEXT,
            "gatewayData" JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
        CREATE TABLE "order_items" (
            "id" SERIAL NOT NULL,
            "orderId" INTEGER NOT NULL,
            "category" "ProductCategory" NOT NULL,
            "productId" INTEGER NOT NULL,
            "quantity" INTEGER NOT NULL DEFAULT 1,
            "price" DOUBLE PRECISION NOT NULL,
            CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- CreateTable (with existence check)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coupons') THEN
        CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accessories') THEN
        CREATE TABLE "accessories" (
    "id" SERIAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "name" TEXT,
    "color" TEXT,
    "care" TEXT,
    "material" TEXT,
    "shippingTime" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sku" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "accessories_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'decorations') THEN
        CREATE TABLE "decorations" (
    "id" SERIAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "name" TEXT,
    "color" TEXT,
    "care" TEXT,
    "material" TEXT,
    "shippingTime" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sku" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "decorations_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'homeAndLiving') THEN
        CREATE TABLE "homeAndLiving" (
    "id" SERIAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "name" TEXT,
    "color" TEXT,
    "care" TEXT,
    "material" TEXT,
    "shippingTime" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sku" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "homeAndLiving_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fashion') THEN
        CREATE TABLE "fashion" (
    "id" SERIAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "name" TEXT,
    "color" TEXT,
    "care" TEXT,
    "material" TEXT,
    "shippingTime" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sku" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "fashion_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Meditation') THEN
        CREATE TABLE "Meditation" (
    "id" SERIAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "name" TEXT,
    "color" TEXT,
    "care" TEXT,
    "material" TEXT,
    "shippingTime" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sku" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Meditation_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digitalBooks') THEN
        CREATE TABLE "digitalBooks" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "author" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "genre" TEXT,
    "releaseDate" TIMESTAMP(3),
    "url" TEXT,
    "fileType" TEXT,
    "coverImage" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overviewImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "digitalBooks_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'music') THEN
        CREATE TABLE "music" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "artist" TEXT,
    "mp3Url" TEXT,
    "mp4Url" TEXT,
    "duration" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDelete" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "music_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sufi_checklists') THEN
        CREATE TABLE "sufi_checklists" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sufi_checklists_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sufi_checklist_items') THEN
        CREATE TABLE "sufi_checklist_items" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "section" "ChecklistSection" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ChecklistItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sufi_checklist_items_pkey" PRIMARY KEY ("id")
        );
    END IF;
END $$;

-- CreateIndex (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Transaction') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Transaction' AND column_name = 'stripePaymentIntentId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Transaction_stripePaymentIntentId_key') THEN
                CREATE UNIQUE INDEX "Transaction_stripePaymentIntentId_key" ON "Transaction"("stripePaymentIntentId");
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coupons') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'code') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'coupons_code_key') THEN
                CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accessories') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accessories' AND column_name = 'sku') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'accessories_sku_key') THEN
                CREATE UNIQUE INDEX "accessories_sku_key" ON "accessories"("sku");
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'decorations') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'decorations' AND column_name = 'sku') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'decorations_sku_key') THEN
                CREATE UNIQUE INDEX "decorations_sku_key" ON "decorations"("sku");
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'homeAndLiving') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'homeAndLiving' AND column_name = 'sku') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'homeAndLiving_sku_key') THEN
                CREATE UNIQUE INDEX "homeAndLiving_sku_key" ON "homeAndLiving"("sku");
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fashion') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fashion' AND column_name = 'sku') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fashion_sku_key') THEN
                CREATE UNIQUE INDEX "fashion_sku_key" ON "fashion"("sku");
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Meditation') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Meditation' AND column_name = 'sku') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Meditation_sku_key') THEN
                CREATE UNIQUE INDEX "Meditation_sku_key" ON "Meditation"("sku");
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sufi_checklists') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sufi_checklists' AND column_name = 'userId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sufi_checklists_userId_key') THEN
                CREATE UNIQUE INDEX "sufi_checklists_userId_key" ON "sufi_checklists"("userId");
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interviews') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'interviews' AND column_name = 'userId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'interviews_userId_key') THEN
                CREATE UNIQUE INDEX "interviews_userId_key" ON "interviews"("userId");
            END IF;
        END IF;
    END IF;
END $$;

-- AddForeignKey (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'userId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_userId_fkey') THEN
                ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'orderId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_orderId_fkey') THEN
                    ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

-- AddForeignKey (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coupons') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'createdBy') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_createdBy_fkey') THEN
                ALTER TABLE "coupons" ADD CONSTRAINT "coupons_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accessories') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accessories' AND column_name = 'userId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accessories_userId_fkey') THEN
                ALTER TABLE "accessories" ADD CONSTRAINT "accessories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'decorations') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'decorations' AND column_name = 'userId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decorations_userId_fkey') THEN
                ALTER TABLE "decorations" ADD CONSTRAINT "decorations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'homeAndLiving') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'homeAndLiving' AND column_name = 'userId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'homeAndLiving_userId_fkey') THEN
                ALTER TABLE "homeAndLiving" ADD CONSTRAINT "homeAndLiving_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fashion') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fashion' AND column_name = 'userId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fashion_userId_fkey') THEN
                ALTER TABLE "fashion" ADD CONSTRAINT "fashion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Meditation') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Meditation' AND column_name = 'userId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Meditation_userId_fkey') THEN
                ALTER TABLE "Meditation" ADD CONSTRAINT "Meditation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digitalBooks') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'digitalBooks' AND column_name = 'userId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digitalBooks_userId_fkey') THEN
                ALTER TABLE "digitalBooks" ADD CONSTRAINT "digitalBooks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'music') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'music' AND column_name = 'userId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'music_userId_fkey') THEN
                ALTER TABLE "music" ADD CONSTRAINT "music_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- AddForeignKey (with existence checks for reviews)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'musicId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'music') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_musicId_fkey') THEN
                    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "music"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'bookId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digitalBooks') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_bookId_fkey') THEN
                    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "digitalBooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'meditationId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Meditation') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_meditationId_fkey') THEN
                    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_meditationId_fkey" FOREIGN KEY ("meditationId") REFERENCES "Meditation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'fashionId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fashion') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_fashionId_fkey') THEN
                    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_fashionId_fkey" FOREIGN KEY ("fashionId") REFERENCES "fashion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'livingId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'homeAndLiving') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_livingId_fkey') THEN
                    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_livingId_fkey" FOREIGN KEY ("livingId") REFERENCES "homeAndLiving"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'decorationId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'decorations') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_decorationId_fkey') THEN
                    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_decorationId_fkey" FOREIGN KEY ("decorationId") REFERENCES "decorations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'accessoriesId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accessories') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_accessoriesId_fkey') THEN
                    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_accessoriesId_fkey" FOREIGN KEY ("accessoriesId") REFERENCES "accessories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

-- AddForeignKey (with existence checks for carts)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'carts') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'musicId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'music') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_musicId_fkey') THEN
                    ALTER TABLE "carts" ADD CONSTRAINT "carts_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "music"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'bookId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digitalBooks') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_bookId_fkey') THEN
                    ALTER TABLE "carts" ADD CONSTRAINT "carts_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "digitalBooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'meditationId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Meditation') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_meditationId_fkey') THEN
                    ALTER TABLE "carts" ADD CONSTRAINT "carts_meditationId_fkey" FOREIGN KEY ("meditationId") REFERENCES "Meditation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'fashionId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fashion') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_fashionId_fkey') THEN
                    ALTER TABLE "carts" ADD CONSTRAINT "carts_fashionId_fkey" FOREIGN KEY ("fashionId") REFERENCES "fashion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'livingId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'homeAndLiving') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_livingId_fkey') THEN
                    ALTER TABLE "carts" ADD CONSTRAINT "carts_livingId_fkey" FOREIGN KEY ("livingId") REFERENCES "homeAndLiving"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'decorationId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'decorations') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_decorationId_fkey') THEN
                    ALTER TABLE "carts" ADD CONSTRAINT "carts_decorationId_fkey" FOREIGN KEY ("decorationId") REFERENCES "decorations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'carts' AND column_name = 'accessoriesId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accessories') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_accessoriesId_fkey') THEN
                    ALTER TABLE "carts" ADD CONSTRAINT "carts_accessoriesId_fkey" FOREIGN KEY ("accessoriesId") REFERENCES "accessories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

-- AddForeignKey (with existence checks for wishlists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlists') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'musicId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'music') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_musicId_fkey') THEN
                    ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "music"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'bookId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digitalBooks') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_bookId_fkey') THEN
                    ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "digitalBooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'meditationId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Meditation') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_meditationId_fkey') THEN
                    ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_meditationId_fkey" FOREIGN KEY ("meditationId") REFERENCES "Meditation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'fashionId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fashion') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_fashionId_fkey') THEN
                    ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_fashionId_fkey" FOREIGN KEY ("fashionId") REFERENCES "fashion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'livingId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'homeAndLiving') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_livingId_fkey') THEN
                    ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_livingId_fkey" FOREIGN KEY ("livingId") REFERENCES "homeAndLiving"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'decorationId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'decorations') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_decorationId_fkey') THEN
                    ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_decorationId_fkey" FOREIGN KEY ("decorationId") REFERENCES "decorations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'accessoriesId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accessories') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_accessoriesId_fkey') THEN
                    ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_accessoriesId_fkey" FOREIGN KEY ("accessoriesId") REFERENCES "accessories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sufi_checklists') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sufi_checklists' AND column_name = 'userId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sufi_checklists_userId_fkey') THEN
                ALTER TABLE "sufi_checklists" ADD CONSTRAINT "sufi_checklists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sufi_checklist_items') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sufi_checklist_items' AND column_name = 'checklistId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sufi_checklists') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sufi_checklist_items_checklistId_fkey') THEN
                    ALTER TABLE "sufi_checklist_items" ADD CONSTRAINT "sufi_checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "sufi_checklists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;
