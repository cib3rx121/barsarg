"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

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

const MONTH_KEY_RE = /^\d{4}-\d{2}$/;

function parseMonthKey(raw: string): string | null {
  const s = raw.trim();
  if (!MONTH_KEY_RE.test(s)) return null;
  const [y, m] = s.split("-").map(Number);
  if (m < 1 || m > 12) return null;
  return s;
}

function parseAmountEurToCents(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number.parseFloat(normalized);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

export async function upsertMonthlyQuota(formData: FormData) {
  await assertAdmin();

  const monthKey = parseMonthKey(String(formData.get("monthKey") ?? ""));
  const amountCents = parseAmountEurToCents(
    String(formData.get("amountEur") ?? ""),
  );

  if (!monthKey || amountCents === null || amountCents <= 0) {
    redirect("/admin?error=2");
  }

  await prisma.monthlyQuota.upsert({
    where: { monthKey },
    create: { monthKey, amountCents },
    update: { amountCents },
  });

  revalidatePath("/admin");
  redirect("/admin");
}
