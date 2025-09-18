/*
  Warnings:

  - The values [PAID,REFUNDED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `firstName` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripePaymentId` on the `orders` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "stripePaymentId",
ADD COLUMN     "email" TEXT DEFAULT '',
ADD COLUMN     "fullName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sPaymentIntentId" TEXT,
ADD COLUMN     "shippingAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "zip" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isCompleted" BOOLEAN DEFAULT false;
