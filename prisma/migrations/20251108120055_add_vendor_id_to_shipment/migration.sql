-- Migration: Add vendorId to shipments table for per-vendor labeling
-- This allows tracking which vendor each shipment belongs to
-- Required for multi-vendor order support

-- AlterTable (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shipments') THEN
        -- Add vendorId column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shipments' AND column_name = 'vendorId') THEN
            ALTER TABLE "shipments" ADD COLUMN "vendorId" TEXT;
        END IF;
    END IF;
END $$;

-- AddForeignKey (with existence check)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shipments') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shipments' AND column_name = 'vendorId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipments_vendorId_fkey') THEN
                    ALTER TABLE "shipments" 
                    ADD CONSTRAINT "shipments_vendorId_fkey" 
                    FOREIGN KEY ("vendorId") 
                    REFERENCES "users"("id") 
                    ON DELETE SET NULL 
                    ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;

-- CreateIndex (with existence check)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shipments') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shipments' AND column_name = 'vendorId') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'shipments_vendorId_idx') THEN
                CREATE INDEX "shipments_vendorId_idx" ON "shipments"("vendorId");
            END IF;
        END IF;
    END IF;
END $$;

