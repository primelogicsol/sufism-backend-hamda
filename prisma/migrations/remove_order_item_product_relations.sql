-- Migration: Remove foreign key constraints from order_items table
-- These constraints were causing conflicts when creating orders
-- Products are now queried directly using category + productId

-- Drop foreign key constraints for product relations
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_item_music";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_item_digital_book";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_item_meditation";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_item_fashion";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_item_decoration";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_item_home_living";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_item_accessories";

