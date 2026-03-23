"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  monthKeyFromUtcDate,
  monthKeysInclusive,
  parseMonthKey,
} from "@/lib/month-keys";
import { backfillMissingMonthlyCharges, reconcileUserCharges } from "@/lib/balance";
import { prisma } from "@/lib/prisma";
import { QUOTA_SETTINGS_ID } from "@/lib/quota";

async function assertAdmin() {
  const session = (await cookies()).get("barsarg_admin_session")?.value;
  if (session !== "ok") {
    redirect("/admin/login");
  }
}

function parseEntryDate(raw: string): Date | null {
  const parts = raw.trim().split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  const [y, m, d] = parts;
  return new Date(Date.UTC(y, m - 1, d));
}

export async function createUser(formData: FormData) {
  await assertAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const entryRaw = String(formData.get("entryDate") ?? "").trim();

  if (!name || !entryRaw) {
    redirect("/admin?error=1");
  }

  const entryDate = parseEntryDate(entryRaw);
  if (!entryDate) {
    redirect("/admin?error=1");
  }

  const chargeStartRaw = String(formData.get("chargeStartDate") ?? "").trim();
  let chargeStartDate: Date | null = null;
  if (chargeStartRaw) {
    const parsed = parseEntryDate(chargeStartRaw);
    if (!parsed) {
      redirect("/admin?error=1");
    }
    const entryMk = monthKeyFromUtcDate(entryDate);
    const chargeMk = monthKeyFromUtcDate(parsed);
    if (chargeMk < entryMk) {
      redirect("/admin?error=8");
    }
    chargeStartDate = parsed;
  }

  const secret = randomBytes(32).toString("hex");
  const publicTokenHash = createHash("sha256").update(secret).digest("hex");

  const user = await prisma.user.create({
    data: {
      name,
      entryDate,
      publicTokenHash,
      chargeStartDate,
    },
  });

  await reconcileUserCharges(user.id);

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateUserChargeStart(formData: FormData) {
  await assertAdmin();

  const userId = String(formData.get("chargeStartUserId") ?? "").trim();
  const raw = String(formData.get("chargeStartDateEdit") ?? "").trim();

  if (!userId || !raw) {
    redirect("/admin?error=7");
  }

  const parsed = parseEntryDate(raw);
  if (!parsed) {
    redirect("/admin?error=7");
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { entryDate: true },
  });
  if (!existing) {
    redirect("/admin?error=7");
  }

  const entryMk = monthKeyFromUtcDate(existing.entryDate);
  const chargeMk = monthKeyFromUtcDate(parsed);
  if (chargeMk < entryMk) {
    redirect("/admin?error=8");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { chargeStartDate: parsed },
  });

  await reconcileUserCharges(userId);

  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}

export async function waiveMonthRange(formData: FormData) {
  await assertAdmin();

  const userId = String(formData.get("waiveUserId") ?? "").trim();
  const from = parseMonthKey(String(formData.get("waiveFromMonth") ?? ""));
  const to = parseMonthKey(String(formData.get("waiveToMonth") ?? ""));
  const noteRaw = String(formData.get("waiveNote") ?? "").trim();

  if (!userId || !from || !to) {
    redirect("/admin?error=7");
  }

  if (from > to) {
    redirect("/admin?error=7");
  }

  const keys = monthKeysInclusive(from, to);
  for (const monthKey of keys) {
    await prisma.waivedMonth.upsert({
      where: {
        userId_monthKey: { userId, monthKey },
      },
      create: {
        userId,
        monthKey,
        note: noteRaw ? noteRaw : null,
      },
      update: noteRaw ? { note: noteRaw } : {},
    });
  }

  await reconcileUserCharges(userId);

  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}

function parseAmountEurToCents(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number.parseFloat(normalized);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Valor unico da cota mensal (igual para todos os meses). */
export async function saveGlobalQuota(formData: FormData) {
  await assertAdmin();

  const amountCents = parseAmountEurToCents(
    String(formData.get("amountEur") ?? ""),
  );

  if (amountCents === null || amountCents <= 0) {
    redirect("/admin?error=2");
  }

  await prisma.quotaSettings.upsert({
    where: { id: QUOTA_SETTINGS_ID },
    create: { id: QUOTA_SETTINGS_ID, amountCents },
    update: { amountCents },
  });

  await backfillMissingMonthlyCharges();

  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}

export async function recordPayment(formData: FormData) {
  await assertAdmin();

  const userId = String(formData.get("payUserId") ?? "").trim();
  const amountCents = parseAmountEurToCents(
    String(formData.get("payAmountEur") ?? ""),
  );
  const monthRaw = String(formData.get("payMonthKey") ?? "").trim();
  const monthKey = monthRaw ? parseMonthKey(monthRaw) : null;
  const noteRaw = String(formData.get("payNote") ?? "").trim();

  if (!userId || amountCents === null || amountCents <= 0) {
    redirect("/admin?error=4");
  }

  if (monthRaw && !monthKey) {
    redirect("/admin?error=4");
  }

  await prisma.ledgerEntry.create({
    data: {
      userId,
      deltaCents: -amountCents,
      kind: "PAYMENT",
      monthKey: monthKey ?? null,
      note: noteRaw ? noteRaw : null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}
