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
import { ensureQuotaSettingsExists, verifyAdminPassword } from "@/lib/app-settings";
import { backfillMissingMonthlyCharges, reconcileUserCharges } from "@/lib/balance";
import { prisma } from "@/lib/prisma";
import { QUOTA_SETTINGS_ID } from "@/lib/quota";
import { hashSecret } from "@/lib/secret-hash";

async function assertAdmin() {
  const session = (await cookies()).get("barsarg_admin_session")?.value;
  if (session !== "ok") {
    redirect("/admin/login");
  }
}

/** Aceita AAAA-MM (preferido) ou AAAA-MM-DD (legado). Mês civil = dia 1 UTC. */
function parseEntryDateFromForm(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const ym = /^(\d{4})-(\d{2})$/.exec(t);
  if (ym) {
    const y = Number(ym[1]);
    const m = Number(ym[2]);
    if (m < 1 || m > 12) return null;
    return new Date(Date.UTC(y, m - 1, 1));
  }
  const parts = t.split("-").map(Number);
  if (parts.length === 3 && !parts.some((n) => Number.isNaN(n))) {
    const [y, m, d] = parts;
    return new Date(Date.UTC(y, m - 1, d));
  }
  return null;
}

export async function createUser(formData: FormData) {
  await assertAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const entryRaw = String(formData.get("entryDate") ?? "").trim();

  if (!name || !entryRaw) {
    redirect("/admin?error=1");
  }

  const entryDate = parseEntryDateFromForm(entryRaw);
  if (!entryDate) {
    redirect("/admin?error=1");
  }

  const chargeStartRaw = String(formData.get("chargeStartDate") ?? "").trim();
  let chargeStartDate: Date | null = null;
  if (chargeStartRaw) {
    const parsed = parseEntryDateFromForm(chargeStartRaw);
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

export async function updateMember(formData: FormData) {
  await assertAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const entryRaw = String(formData.get("entryDate") ?? "").trim();
  const chargeRaw = String(formData.get("chargeStartDate") ?? "").trim();

  if (!userId || !name || !entryRaw) {
    redirect("/admin?error=1");
  }

  const entryDate = parseEntryDateFromForm(entryRaw);
  if (!entryDate) {
    redirect("/admin?error=1");
  }

  let chargeStartDate: Date | null = null;
  if (chargeRaw) {
    const parsed = parseEntryDateFromForm(chargeRaw);
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

  await prisma.user.update({
    where: { id: userId },
    data: { name, entryDate, chargeStartDate },
  });

  await reconcileUserCharges(userId);

  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}

export async function deleteMember(formData: FormData) {
  await assertAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  const confirm = String(formData.get("deleteConfirm") ?? "").trim();

  if (!userId || confirm !== "APAGAR") {
    redirect("/admin?error=9");
  }

  await prisma.user.delete({ where: { id: userId } });

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

/** Valor único da cota mensal (igual para todos os meses). */
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

/** Aumenta a dívida (ex.: «deve 20 €») com um lançamento de ajuste. */
export async function recordDebtAdjustment(formData: FormData) {
  await assertAdmin();

  const userId = String(formData.get("debtUserId") ?? "").trim();
  const amountCents = parseAmountEurToCents(
    String(formData.get("debtAmountEur") ?? ""),
  );
  const noteRaw = String(formData.get("debtNote") ?? "").trim();

  if (!userId || amountCents === null || amountCents <= 0) {
    redirect("/admin?error=10");
  }

  await prisma.ledgerEntry.create({
    data: {
      userId,
      deltaCents: amountCents,
      kind: "ADJUSTMENT",
      monthKey: null,
      note: noteRaw ? noteRaw : "Dívida manual",
    },
  });

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

export async function updateAdminCredentials(formData: FormData) {
  await assertAdmin();

  const currentPassword = String(formData.get("currentPassword") ?? "").trim();
  const newUsername = String(formData.get("newUsername") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (!currentPassword || !newUsername || !newPassword || !confirmPassword) {
    redirect("/admin?error=11");
  }
  if (newPassword.length < 6 || newPassword !== confirmPassword) {
    redirect("/admin?error=11");
  }

  const currentOk = await verifyAdminPassword(currentPassword);
  if (!currentOk) {
    redirect("/admin?error=11");
  }

  await ensureQuotaSettingsExists();
  await prisma.quotaSettings.update({
    where: { id: QUOTA_SETTINGS_ID },
    data: {
      adminUsername: newUsername,
      adminPasswordHash: hashSecret(newPassword),
    },
  });

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateConsultaPin(formData: FormData) {
  await assertAdmin();

  const pin = String(formData.get("consultaPin") ?? "").trim();
  const confirmPin = String(formData.get("confirmConsultaPin") ?? "").trim();
  if (!pin || !confirmPin || pin !== confirmPin) {
    redirect("/admin?error=12");
  }
  if (!/^\d{4,10}$/.test(pin)) {
    redirect("/admin?error=12");
  }

  await ensureQuotaSettingsExists();
  await prisma.quotaSettings.update({
    where: { id: QUOTA_SETTINGS_ID },
    data: {
      consultaPinHash: hashSecret(pin),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}

export async function updatePublicNotice(formData: FormData) {
  await assertAdmin();
  const note = String(formData.get("publicNotice") ?? "").trim();
  if (note.length > 1000) {
    redirect("/admin?error=13");
  }

  await ensureQuotaSettingsExists();
  await prisma.quotaSettings.update({
    where: { id: QUOTA_SETTINGS_ID },
    data: {
      publicNotice: note ? note : null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}
