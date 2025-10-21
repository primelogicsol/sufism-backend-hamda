-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "vendor_id" TEXT NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "order_items_vendor_id_idx" ON "order_items"("vendor_id");

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "status" TYPE "OrderItemStatus" USING ("status"::text::"OrderItemStatus");

-- Populate vendorId from existing product relations
UPDATE "order_items" SET "vendor_id" = (
  SELECT CASE 
    WHEN category = 'FASHION' THEN (SELECT user_id FROM fashion WHERE id = product_id)
    WHEN category = 'MUSIC' THEN (SELECT user_id FROM music WHERE id = product_id)
    WHEN category = 'DIGITAL_BOOK' THEN (SELECT user_id FROM digital_books WHERE id = product_id)
    WHEN category = 'MEDITATION' THEN (SELECT user_id FROM meditation WHERE id = product_id)
    WHEN category = 'DECORATION' THEN (SELECT user_id FROM decoration WHERE id = product_id)
    WHEN category = 'HOME_LIVING' THEN (SELECT user_id FROM home_and_living WHERE id = product_id)
    WHEN category = 'ACCESSORIES' THEN (SELECT user_id FROM accessories WHERE id = product_id)
  END
) WHERE "vendor_id" = '';

-- Remove default value after population
ALTER TABLE "order_items" ALTER COLUMN "vendor_id" DROP DEFAULT;
