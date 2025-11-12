-- AlterTable (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'status') THEN
            ALTER TABLE "order_items" ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'vendorNic') THEN
            ALTER TABLE "users" ADD COLUMN "vendorNic" TEXT;
        END IF;
    END IF;
END $$;
