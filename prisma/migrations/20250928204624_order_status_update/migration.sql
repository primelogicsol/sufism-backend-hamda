-- AlterEnum (with existence check)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        -- Check if 'DISPATCH' value already exists in the enum
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'DISPATCH' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
        ) THEN
            ALTER TYPE "OrderStatus" ADD VALUE 'DISPATCH';
        END IF;
    END IF;
END $$;

-- AlterTable (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'createdAt') THEN
            ALTER TABLE "order_items" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'updatedAt') THEN
            ALTER TABLE "order_items" ADD COLUMN "updatedAt" TIMESTAMP(3);
        END IF;
    END IF;
END $$;

-- AddForeignKey (with existence check)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Transaction') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Transaction' AND column_name = 'orderId') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_orderId_fkey') THEN
                    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
                END IF;
            END IF;
        END IF;
    END IF;
END $$;
