-- Primeira cobranca (mes): null = desde o mes da entrada
ALTER TABLE "User" ADD COLUMN "chargeStartDate" DATE;

CREATE TABLE "WaivedMonth" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "monthKey" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaivedMonth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaivedMonth_userId_monthKey_key" ON "WaivedMonth"("userId", "monthKey");

CREATE INDEX "WaivedMonth_userId_idx" ON "WaivedMonth"("userId");

ALTER TABLE "WaivedMonth" ADD CONSTRAINT "WaivedMonth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
