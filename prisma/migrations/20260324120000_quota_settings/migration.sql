-- Replace per-month quotas with a single global monthly amount.
DROP TABLE IF EXISTS "MonthlyQuota";

CREATE TABLE "QuotaSettings" (
    "id" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotaSettings_pkey" PRIMARY KEY ("id")
);
