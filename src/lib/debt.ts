import { prisma } from "@/lib/prisma";
import {
  currentMonthKeyUtc,
  monthKeyFromUtcDate,
  monthKeysInclusive,
} from "@/lib/month-keys";

export type DebtSummary = {
  totalOwedCents: number;
  owedMonthCount: number;
  monthsWithoutQuota: string[];
};

export async function computeDebtsForUsers(
  users: { id: string; entryDate: Date }[],
): Promise<Map<string, DebtSummary>> {
  if (users.length === 0) {
    return new Map();
  }

  const userIds = users.map((u) => u.id);
  const [payments, quotas] = await Promise.all([
    prisma.payment.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, monthKey: true },
    }),
    prisma.monthlyQuota.findMany({
      select: { monthKey: true, amountCents: true },
    }),
  ]);

  const quotaByMonth = new Map(
    quotas.map((q) => [q.monthKey, q.amountCents]),
  );

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
    let totalOwedCents = 0;
    let owedMonthCount = 0;
    const monthsWithoutQuota: string[] = [];

    for (const mk of monthKeysInclusive(start, end)) {
      if (paid.has(mk)) continue;
      const q = quotaByMonth.get(mk);
      if (q === undefined) {
        monthsWithoutQuota.push(mk);
        continue;
      }
      totalOwedCents += q;
      owedMonthCount += 1;
    }

    result.set(u.id, {
      totalOwedCents,
      owedMonthCount,
      monthsWithoutQuota,
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

  const start = monthKeyFromUtcDate(user.entryDate);
  const end = currentMonthKeyUtc();

  const [payments, quotas] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      select: { monthKey: true },
    }),
    prisma.monthlyQuota.findMany({
      select: { monthKey: true, amountCents: true },
    }),
  ]);

  const paid = new Set(payments.map((p) => p.monthKey));
  const quotaByMonth = new Map(
    quotas.map((q) => [q.monthKey, q.amountCents]),
  );

  const owedLines: OwedMonthLine[] = [];
  const monthsWithoutQuota: string[] = [];

  for (const mk of monthKeysInclusive(start, end)) {
    if (paid.has(mk)) continue;
    const q = quotaByMonth.get(mk);
    if (q === undefined) {
      monthsWithoutQuota.push(mk);
      continue;
    }
    owedLines.push({ monthKey: mk, amountCents: q });
  }

  const totalOwedCents = owedLines.reduce((s, l) => s + l.amountCents, 0);

  return {
    user,
    owedLines,
    monthsWithoutQuota,
    totalOwedCents,
  };
}
