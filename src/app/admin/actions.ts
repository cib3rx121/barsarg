"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseMonthKey } from "@/lib/month-keys";
import { prisma } from "@/lib/prisma";
import { getGlobalQuotaCents, QUOTA_SETTINGS_ID } from "@/lib/quota";

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

  const secret = randomBytes(32).toString("hex");
  const publicTokenHash = createHash("sha256").update(secret).digest("hex");

  await prisma.user.create({
    data: {
      name,
      entryDate,
      publicTokenHash,
    },
  });

  revalidatePath("/admin");
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

  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}

export async function recordPayment(formData: FormData) {
  await assertAdmin();

  const userId = String(formData.get("payUserId") ?? "").trim();
  const monthKey = parseMonthKey(String(formData.get("payMonthKey") ?? ""));
  const noteRaw = String(formData.get("payNote") ?? "").trim();

  if (!userId || !monthKey) {
    redirect("/admin?error=4");
  }

  const globalCents = await getGlobalQuotaCents();
  if (globalCents === null || globalCents <= 0) {
    redirect("/admin?error=5");
  }

  const existing = await prisma.payment.findUnique({
    where: {
      userId_monthKey: { userId, monthKey },
    },
  });
  if (existing) {
    redirect("/admin?error=6");
  }

  await prisma.payment.create({
    data: {
      userId,
      monthKey,
      amountCents: globalCents,
      note: noteRaw ? noteRaw : null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}
