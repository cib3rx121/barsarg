CREATE TABLE "MonthClosure" (
  "id" UUID NOT NULL,
  "monthKey" TEXT NOT NULL,
  "totalUsers" INTEGER NOT NULL,
  "debtUsers" INTEGER NOT NULL,
  "creditUsers" INTEGER NOT NULL,
  "totalDebtCents" INTEGER NOT NULL,
  "totalCreditCents" INTEGER NOT NULL,
  "totalReceivedCents" INTEGER NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MonthClosure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthClosure_monthKey_key" ON "MonthClosure"("monthKey");

