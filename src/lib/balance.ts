import {
  currentMonthKeyUtc,
  monthKeyFromUtcDate,
  monthKeysInclusive,
} from "@/lib/month-keys";
import { prisma } from "@/lib/prisma";
import { getGlobalQuotaCents } from "@/lib/quota";

/** Primeiro mês em que a cota se aplica (entrada ou data definida pelo administrador). */
export function firstChargeMonthKey(user: {
  entryDate: Date;
  chargeStartDate: Date | null;
}): string {
  return monthKeyFromUtcDate(user.chargeStartDate ?? user.entryDate);
}

/** Positivo = deve ao bar; negativo = crédito. */
export type BalanceSummary = {
  balanceCents: number;
  /** Com base na cota atual; 0 se saldo <= 0 ou cota não definida. */
  estimatedMonthsEquivalent: number;
  quotaNotConfigured: boolean;
};

export async function computeBalancesForUsers(
  users: { id: string }[],
): Promise<Map<string, BalanceSummary>> {
  if (users.length === 0) {
    return new Map();
  }

  const globalCents = await getGlobalQuotaCents();
  const userIds = users.map((u) => u.id);

  const sums = await prisma.ledgerEntry.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _sum: { deltaCents: true },
  });

  const sumByUser = new Map<string, number>();
  for (const row of sums) {
    sumByUser.set(row.userId, row._sum.deltaCents ?? 0);
  }

  const quotaNotConfigured = globalCents === null || globalCents <= 0;
  const result = new Map<string, BalanceSummary>();

  for (const u of users) {
    const balanceCents = sumByUser.get(u.id) ?? 0;
    const estimatedMonthsEquivalent =
      !quotaNotConfigured && globalCents && balanceCents > 0
        ? Math.ceil(balanceCents / globalCents)
        : 0;

    result.set(u.id, {
      balanceCents,
      estimatedMonthsEquivalent,
      quotaNotConfigured,
    });
  }

  return result;
}

export type LedgerRow = {
  id: string;
  deltaCents: number;
  kind: string;
  monthKey: string | null;
  note: string | null;
  createdAt: Date;
};

export async function computeBalanceDetailForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    return null;
  }

  const globalCents = await getGlobalQuotaCents();
  const quotaNotConfigured = globalCents === null || globalCents <= 0;

  const [agg, entries] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { userId },
      _sum: { deltaCents: true },
    }),
    prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        deltaCents: true,
        kind: true,
        monthKey: true,
        note: true,
        createdAt: true,
      },
    }),
  ]);

  const balanceCents = agg._sum.deltaCents ?? 0;
  const estimatedMonthsEquivalent =
    !quotaNotConfigured && globalCents && balanceCents > 0
      ? Math.ceil(balanceCents / globalCents)
      : 0;

  return {
    user,
    balanceCents,
    estimatedMonthsEquivalent,
    quotaNotConfigured,
    ledgerEntries: entries as LedgerRow[],
  };
}

/** Alinha cargas mensais com início de cobrança, meses isentos e mês atual. */
export async function reconcileUserCharges(userId: string): Promise<void> {
  const quota = await getGlobalQuotaCents();
  if (quota === null || quota <= 0) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, entryDate: true, chargeStartDate: true },
  });
  if (!user) return;

  const start = firstChargeMonthKey(user);
  const end = currentMonthKeyUtc();

  const waived = await prisma.waivedMonth.findMany({
    where: { userId },
    select: { monthKey: true },
  });
  const waivedSet = new Set(waived.map((w) => w.monthKey));

  const inclusiveKeys = monthKeysInclusive(start, end);
  const validKeys = inclusiveKeys.filter((k) => !waivedSet.has(k));
  const validSet = new Set(validKeys);

  const existingCharges = await prisma.ledgerEntry.findMany({
    where: { userId, kind: "CHARGE_MONTH" },
    select: { id: true, monthKey: true },
  });

  const toDeleteIds = existingCharges
    .filter((e) => e.monthKey == null || !validSet.has(e.monthKey))
    .map((e) => e.id);

  if (toDeleteIds.length > 0) {
    await prisma.ledgerEntry.deleteMany({
      where: { id: { in: toDeleteIds } },
    });
  }

  const after = await prisma.ledgerEntry.findMany({
    where: { userId, kind: "CHARGE_MONTH" },
    select: { monthKey: true },
  });
  const have = new Set(
    after.map((e) => e.monthKey).filter((m): m is string => m != null),
  );
  const missing = validKeys.filter((k) => !have.has(k));
  if (missing.length === 0) return;

  await prisma.ledgerEntry.createMany({
    data: missing.map((monthKey) => ({
      userId,
      deltaCents: quota,
      kind: "CHARGE_MONTH",
      monthKey,
    })),
  });
}

export async function reconcileAllUsersCharges(): Promise<void> {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const u of users) {
    await reconcileUserCharges(u.id);
  }
}

/** Mantém o nome antigo: agora faz reconciliação completa por utilizador. */
export async function backfillMissingMonthlyCharges(): Promise<void> {
  await reconcileAllUsersCharges();
}

export function ledgerKindLabel(kind: string): string {
  switch (kind) {
    case "CHARGE_MONTH":
      return "Cota mensal";
    case "PAYMENT":
      return "Pagamento";
    case "ADJUSTMENT":
      return "Dívida manual";
    default:
      return kind;
  }
}
