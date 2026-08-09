CREATE TYPE "CommerceMode" AS ENUM ('MENU_ONLY', 'ORDERS', 'ONLINE_PAYMENT');

ALTER TYPE "PaymentMethod" ADD VALUE 'CASH';
ALTER TYPE "PaymentMethod" ADD VALUE 'CARD_ON_RECEIPT';

ALTER TABLE "StoreSettings"
  ADD COLUMN "commerceMode" "CommerceMode" NOT NULL DEFAULT 'ORDERS',
  ADD COLUMN "demoOrdersEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Order" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Order_isTest_createdAt_idx" ON "Order"("isTest", "createdAt");
