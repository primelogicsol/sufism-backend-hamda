-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('credentials', 'google');

-- CreateEnum
CREATE TYPE "VolunteeringMode" AS ENUM ('IN_PERSON', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "DONATIONTYPE" AS ENUM ('ONE_TIME', 'MONTHLY', 'GENERAL_DONATIONS', 'SPONSORSHIP_DONATIONS', 'PATRON_MEMBERSHIP_CONTRIBUTIONS', 'EDUCATIONAL_SCHOLARSHIP_DONATIONS', 'LEGACY_PLANNED_GIVING', 'RECURRING');

-- CreateEnum
CREATE TYPE "TPOOL" AS ENUM ('SUFI_SCIENCE_CENTER', 'SPONSOR_SCHOLAR', 'PRESERVE_ART_AND_CRAFT', 'SPONSOR_EVENTS');

-- CreateTable
CREATE TABLE "RateLimiterFlexible" (
    "key" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "expire" TIMESTAMP(3),

    CONSTRAINT "RateLimiterFlexible_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "avatar" TEXT DEFAULT 'https://via.placeholder.com/70x70',
    "OTP" TEXT,
    "OTP_EXPIRES_IN" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'credentials',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "role" TEXT[],
    "volunteerSupport" TEXT[] DEFAULT ARRAY['']::TEXT[],
    "previousVolunteerExp" TEXT,
    "monthlyTime" TEXT,
    "volunteerMode" "VolunteeringMode" NOT NULL DEFAULT 'IN_PERSON',
    "donorType" TEXT[] DEFAULT ARRAY['']::TEXT[],
    "collaboratorIntent" TEXT[] DEFAULT ARRAY['']::TEXT[],
    "organization" TEXT,
    "intentCreation" TEXT,
    "additionalInfo" TEXT,
    "agreedToPrinciples" BOOLEAN NOT NULL DEFAULT false,
    "consentedToUpdates" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "pool" "TPOOL"[] DEFAULT ARRAY['SUFI_SCIENCE_CENTER']::"TPOOL"[],
    "donorType" "DONATIONTYPE" NOT NULL DEFAULT 'ONE_TIME',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_OTP_key" ON "users"("OTP");

-- CreateIndex
CREATE UNIQUE INDEX "members_userId_key" ON "members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "donations_userId_key" ON "donations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "products_userId_key" ON "products"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
