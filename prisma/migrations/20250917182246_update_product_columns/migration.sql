-- AlterTable (with existence checks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'country') THEN
            ALTER TABLE "orders" ADD COLUMN "country" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'firstName') THEN
            ALTER TABLE "orders" ADD COLUMN "firstName" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'lastName') THEN
            ALTER TABLE "orders" ADD COLUMN "lastName" TEXT DEFAULT '';
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'accountNumber') THEN
            ALTER TABLE "users" ADD COLUMN "accountNumber" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'bankAddress') THEN
            ALTER TABLE "users" ADD COLUMN "bankAddress" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'bankName') THEN
            ALTER TABLE "users" ADD COLUMN "bankName" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'businessName') THEN
            ALTER TABLE "users" ADD COLUMN "businessName" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'businessType') THEN
            ALTER TABLE "users" ADD COLUMN "businessType" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'contactPerson') THEN
            ALTER TABLE "users" ADD COLUMN "contactPerson" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'einNumber') THEN
            ALTER TABLE "users" ADD COLUMN "einNumber" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'routingNumber') THEN
            ALTER TABLE "users" ADD COLUMN "routingNumber" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'signatoryName') THEN
            ALTER TABLE "users" ADD COLUMN "signatoryName" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'signatureDate') THEN
            ALTER TABLE "users" ADD COLUMN "signatureDate" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'tinNumber') THEN
            ALTER TABLE "users" ADD COLUMN "tinNumber" TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'vendoraccepted') THEN
            ALTER TABLE "users" ADD COLUMN "vendoraccepted" BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;
