-- Migration: Remove foreign key constraints from order_items table
-- These constraints were causing conflicts when creating orders
-- Products are now queried directly using category + productId

-- DropForeignKey (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
        -- Drop foreign key constraints if they exist
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_music') THEN
            ALTER TABLE "order_items" DROP CONSTRAINT "order_item_music";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_digital_book') THEN
            ALTER TABLE "order_items" DROP CONSTRAINT "order_item_digital_book";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_meditation') THEN
            ALTER TABLE "order_items" DROP CONSTRAINT "order_item_meditation";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_fashion') THEN
            ALTER TABLE "order_items" DROP CONSTRAINT "order_item_fashion";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_decoration') THEN
            ALTER TABLE "order_items" DROP CONSTRAINT "order_item_decoration";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_home_living') THEN
            ALTER TABLE "order_items" DROP CONSTRAINT "order_item_home_living";
        END IF;
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_accessories') THEN
            ALTER TABLE "order_items" DROP CONSTRAINT "order_item_accessories";
        END IF;
    END IF;
END $$;

