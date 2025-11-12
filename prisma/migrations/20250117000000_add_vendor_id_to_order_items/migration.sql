-- AlterTable
-- Check if order_items table exists before altering it
-- This migration has an early timestamp but needs to run after table creation
DO $$
BEGIN
    -- Check if the order_items table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'order_items'
    ) THEN
        -- Add vendorId column (nullable first to handle existing rows)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'order_items' 
            AND column_name = 'vendorId'
        ) THEN
            ALTER TABLE "order_items" ADD COLUMN "vendorId" TEXT;
        END IF;

        -- AddForeignKey if constraint doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'order_items_vendorId_fkey'
        ) THEN
            ALTER TABLE "order_items" 
            ADD CONSTRAINT "order_items_vendorId_fkey" 
            FOREIGN KEY ("vendorId") 
            REFERENCES "users"("id") 
            ON DELETE RESTRICT 
            ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

