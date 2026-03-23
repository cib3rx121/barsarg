-- Ledger: saldo = soma de deltaCents (+ aumenta divida, - pagamentos / credito)

CREATE TABLE "LedgerEntry" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deltaCents" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "monthKey" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LedgerEntry_userId_createdAt_idx" ON "LedgerEntry"("userId", "createdAt");

ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cargas mensais desde entrada ate mes actual (UTC), usando cota global actual
INSERT INTO "LedgerEntry" ("id", "userId", "deltaCents", "kind", "monthKey", "note", "createdAt")
SELECT
  gen_random_uuid(),
  u."id",
  qs."amountCents",
  'CHARGE_MONTH',
  to_char(m, 'YYYY-MM'),
  NULL,
  CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN "QuotaSettings" qs
CROSS JOIN LATERAL generate_series(
  date_trunc('month', u."entryDate"::timestamp),
  date_trunc('month', timezone('utc', now())),
  interval '1 month'
) AS m
WHERE qs."id" = 'default'
  AND date_trunc('month', u."entryDate"::timestamp) <= date_trunc('month', timezone('utc', now()));

-- Pagamentos existentes como abatimento ao saldo
INSERT INTO "LedgerEntry" ("id", "userId", "deltaCents", "kind", "monthKey", "note", "createdAt")
SELECT
  gen_random_uuid(),
  p."userId",
  -p."amountCents",
  'PAYMENT',
  p."monthKey",
  p."note",
  p."paidAt"
FROM "Payment" p;

DROP TABLE "Payment";
