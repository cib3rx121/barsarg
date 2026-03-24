ALTER TABLE "QuotaSettings"
ADD COLUMN "adminUsername" TEXT,
ADD COLUMN "adminPasswordHash" TEXT,
ADD COLUMN "consultaPinHash" TEXT,
ADD COLUMN "publicNotice" TEXT;

