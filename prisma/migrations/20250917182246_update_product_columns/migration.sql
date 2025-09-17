-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "country" TEXT DEFAULT '',
ADD COLUMN     "firstName" TEXT DEFAULT '',
ADD COLUMN     "lastName" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountNumber" TEXT DEFAULT '',
ADD COLUMN     "bankAddress" TEXT DEFAULT '',
ADD COLUMN     "bankName" TEXT DEFAULT '',
ADD COLUMN     "businessName" TEXT DEFAULT '',
ADD COLUMN     "businessType" TEXT DEFAULT '',
ADD COLUMN     "contactPerson" TEXT DEFAULT '',
ADD COLUMN     "einNumber" TEXT DEFAULT '',
ADD COLUMN     "routingNumber" TEXT DEFAULT '',
ADD COLUMN     "signatoryName" TEXT DEFAULT '',
ADD COLUMN     "signatureDate" TEXT DEFAULT '',
ADD COLUMN     "tinNumber" TEXT DEFAULT '',
ADD COLUMN     "vendoraccepted" BOOLEAN DEFAULT false;
