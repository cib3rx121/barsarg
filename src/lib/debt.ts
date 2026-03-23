import { prisma } from "@/lib/prisma";
import { getGlobalQuotaCents } from "@/lib/quota";
import {
  currentMonthKeyUtc,
  monthKeyFromUtcDate,
  monthKeysInclusive,
} from "@/lib/month-keys";

export type DebtSummary = {
  totalOwedCents: number;
  owedMonthCount: number;
  /** true quando ainda nao ha valor de cota definido no painel */
  quotaNotConfigured: boolean;
};

export async function computeDebtsForUsers(
  users: { id: string; entryDate: Date }[],
): Promise<Map<string, DebtSummary>> {
  if (users.length === 0) {
    return new Map();
  }

  const globalCents = await getGlobalQuotaCents();
  const userIds = users.map((u) => u.id);
  const payments = await prisma.payment.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, monthKey: true },
  });

  const paidByUser = new Map<string, Set<string>>();
  for (const p of payments) {
    if (!paidByUser.has(p.userId)) {
      paidByUser.set(p.userId, new Set());
    }
    paidByUser.get(p.userId)!.add(p.monthKey);
  }

  const end = currentMonthKeyUtc();
  const result = new Map<string, DebtSummary>();

  for (const u of users) {
    const start = monthKeyFromUtcDate(u.entryDate);
    const paid = paidByUser.get(u.id) ?? new Set();
    let unpaidMonths = 0;
    for (const mk of monthKeysInclusive(start, end)) {
      if (!paid.has(mk)) unpaidMonths += 1;
    }

    if (globalCents === null || globalCents <= 0) {
      result.set(u.id, {
        totalOwedCents: 0,
        owedMonthCount: unpaidMonths,
        quotaNotConfigured: true,
      });
      continue;
    }

    result.set(u.id, {
      totalOwedCents: unpaidMonths * globalCents,
      owedMonthCount: unpaidMonths,
      quotaNotConfigured: false,
    });
  }

  return result;
}

export type OwedMonthLine = { monthKey: string; amountCents: number };

export async function computeOwedBreakdownForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    return null;
  }

  const globalCents = await getGlobalQuotaCents();
  const start = monthKeyFromUtcDate(user.entryDate);
  const end = currentMonthKeyUtc();

  const payments = await prisma.payment.findMany({
    where: { userId },
    select: { monthKey: true },
  });

  const paid = new Set(payments.map((p) => p.monthKey));

  const unpaidMonths: string[] = [];
  for (const mk of monthKeysInclusive(start, end)) {
    if (!paid.has(mk)) {
      unpaidMonths.push(mk);
    }
  }

  const quotaNotConfigured = globalCents === null || globalCents <= 0;

  if (quotaNotConfigured) {
    return {
      user,
      owedLines: [] as OwedMonthLine[],
      unpaidMonthsPendingQuota: unpaidMonths,
      quotaNotConfigured: true,
      totalOwedCents: 0,
    };
  }

  const owedLines: OwedMonthLine[] = unpaidMonths.map((mk) => ({
    monthKey: mk,
    amountCents: globalCents,
  }));

  const totalOwedCents = owedLines.reduce((s, l) => s + l.amountCents, 0);

  return {
    user,
    owedLines,
    unpaidMonthsPendingQuota: [] as string[],
    quotaNotConfigured: false,
    totalOwedCents,
  };
}
