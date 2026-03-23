-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publicTokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyQuota" (
    "id" UUID NOT NULL,
    "monthKey" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "monthKey" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountCents" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_publicTokenHash_key" ON "User"("publicTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyQuota_monthKey_key" ON "MonthlyQuota"("monthKey");

-- CreateIndex
CREATE INDEX "Payment_monthKey_idx" ON "Payment"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_userId_monthKey_key" ON "Payment"("userId", "monthKey");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
