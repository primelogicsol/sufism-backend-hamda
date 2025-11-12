/*
  Warnings:

  - The values [PAID,REFUNDED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `firstName` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripePaymentId` on the `orders` table. All the data in the column will be lost.

*/
-- CreateEnum (with existence check)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
    END IF;
END $$;

-- AlterEnum (with existence checks and value mapping)
DO $$ BEGIN
    -- Only alter if OrderStatus enum exists and orders table exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
            -- Check if the new enum already exists (from a previous partial migration)
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus_new') THEN
                BEGIN
                    CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
                    
                    -- Helper function to map old status values to new ones
                    -- Update orders.status
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'status') THEN
                        ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
                        ALTER TABLE "orders" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
                        
                        UPDATE "orders" 
                        SET "status" = CASE 
                            WHEN "status" IN ('PENDING', 'CONFIRMED', 'PROCESSING') THEN 'PENDING'
                            WHEN "status" IN ('SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'PAID', 'REFUNDED', 'COMPLETED') THEN 'COMPLETED'
                            WHEN "status" IN ('RETURNED', 'CANCELLED') THEN 'CANCELLED'
                            WHEN "status" = 'FAILED' THEN 'FAILED'
                            ELSE 'PENDING'
                        END;
                        
                        ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING "status"::"OrderStatus_new";
                        ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
                    END IF;
                    
                    -- Update order_history.status
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_history' AND column_name = 'status') THEN
                        ALTER TABLE "order_history" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
                        
                        UPDATE "order_history" 
                        SET "status" = CASE 
                            WHEN "status" IN ('PENDING', 'CONFIRMED', 'PROCESSING') THEN 'PENDING'
                            WHEN "status" IN ('SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'PAID', 'REFUNDED', 'COMPLETED') THEN 'COMPLETED'
                            WHEN "status" IN ('RETURNED', 'CANCELLED') THEN 'CANCELLED'
                            WHEN "status" = 'FAILED' THEN 'FAILED'
                            ELSE 'PENDING'
                        END;
                        
                        ALTER TABLE "order_history" ALTER COLUMN "status" TYPE "OrderStatus_new" USING "status"::"OrderStatus_new";
                    END IF;
                    
                    -- Update order_history.previousStatus
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_history' AND column_name = 'previousStatus') THEN
                        ALTER TABLE "order_history" ALTER COLUMN "previousStatus" TYPE TEXT USING "previousStatus"::text;
                        
                        UPDATE "order_history" 
                        SET "previousStatus" = CASE 
                            WHEN "previousStatus" IN ('PENDING', 'CONFIRMED', 'PROCESSING') THEN 'PENDING'
                            WHEN "previousStatus" IN ('SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'PAID', 'REFUNDED', 'COMPLETED') THEN 'COMPLETED'
                            WHEN "previousStatus" IN ('RETURNED', 'CANCELLED') THEN 'CANCELLED'
                            WHEN "previousStatus" = 'FAILED' THEN 'FAILED'
                            ELSE NULL
                        END
                        WHERE "previousStatus" IS NOT NULL;
                        
                        ALTER TABLE "order_history" ALTER COLUMN "previousStatus" TYPE "OrderStatus_new" USING "previousStatus"::"OrderStatus_new";
                    END IF;
                    
                    -- Now we can safely rename and drop the old enum
                    ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
                    ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
                    DROP TYPE "OrderStatus_old";
                EXCEPTION WHEN OTHERS THEN
                    -- If something fails, try to clean up
                    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus_new') THEN
                        DROP TYPE "OrderStatus_new";
                    END IF;
                    RAISE;
                END;
            END IF;
        END IF;
    END IF;
END $$;

-- AlterTable (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        -- Drop columns if they exist
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'firstName') THEN
            ALTER TABLE "orders" DROP COLUMN "firstName";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'lastName') THEN
            ALTER TABLE "orders" DROP COLUMN "lastName";
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'stripePaymentId') THEN
            ALTER TABLE "orders" DROP COLUMN "stripePaymentId";
        END IF;
        
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'email') THEN
            ALTER TABLE "orders" ADD COLUMN "email" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'fullName') THEN
            ALTER TABLE "orders" ADD COLUMN "fullName" TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'paymentStatus') THEN
            ALTER TABLE "orders" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'phone') THEN
            ALTER TABLE "orders" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'sPaymentIntentId') THEN
            ALTER TABLE "orders" ADD COLUMN "sPaymentIntentId" TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shippingAddress') THEN
            ALTER TABLE "orders" ADD COLUMN "shippingAddress" TEXT NOT NULL DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'zip') THEN
            ALTER TABLE "orders" ADD COLUMN "zip" TEXT NOT NULL DEFAULT '';
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'isCompleted') THEN
            ALTER TABLE "users" ADD COLUMN "isCompleted" BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;
