"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  currentMonthKeyUtc,
  monthKeyFromUtcDate,
  monthKeysInclusive,
  parseMonthKey,
} from "@/lib/month-keys";
import { ensureQuotaSettingsExists, verifyAdminPassword } from "@/lib/app-settings";
import {
  backfillMissingMonthlyCharges,
  computeBalancesForUsers,
  reconcileUserCharges,
} from "@/lib/balance";
import { prisma } from "@/lib/prisma";
import { QUOTA_SETTINGS_ID } from "@/lib/quota";
import { hashSecret } from "@/lib/secret-hash";
import { computeEventSplit } from "@/lib/events";

async function assertAdmin() {
  const session = (await cookies()).get("barsarg_admin_session")?.value;
  if (session !== "ok") {
    redirect("/admin/login");
  }
}

async function logAdminEvent(input: {
  action: string;
  entity: string;
  entityId?: string;
  note?: string;
}) {
  await prisma.auditLog.create({
    data: {
      actor: "admin",
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      note: input.note ?? null,
    },
  });
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
  await logAdminEvent({
    action: "CREATE",
    entity: "USER",
    entityId: user.id,
    note: `Novo associado: ${name}`,
  });

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
  await logAdminEvent({
    action: "UPDATE",
    entity: "USER",
    entityId: userId,
    note: `Atualização de dados: ${name}`,
  });

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
  await logAdminEvent({
    action: "DELETE",
    entity: "USER",
    entityId: userId,
    note: "Associado eliminado",
  });

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
  await logAdminEvent({
    action: "UPDATE",
    entity: "WAIVER",
    entityId: userId,
    note: `Isenção aplicada: ${from} até ${to}`,
  });

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
  await logAdminEvent({
    action: "UPDATE",
    entity: "QUOTA",
    entityId: QUOTA_SETTINGS_ID,
    note: `Cota mensal atualizada para ${(amountCents / 100).toFixed(2)} EUR`,
  });

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
  await logAdminEvent({
    action: "CREATE",
    entity: "LEDGER_ADJUSTMENT",
    entityId: userId,
    note: `Dívida manual: ${(amountCents / 100).toFixed(2)} EUR`,
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
  await logAdminEvent({
    action: "CREATE",
    entity: "LEDGER_PAYMENT",
    entityId: userId,
    note: `Pagamento: ${(amountCents / 100).toFixed(2)} EUR${monthKey ? ` (${monthKey})` : ""}`,
  });

  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}

export async function createAdminAccessUser(formData: FormData) {
  await assertAdmin();

  const currentPassword = String(formData.get("currentPasswordForCreateUser") ?? "").trim();
  const newUsername = String(formData.get("newAccessUsername") ?? "").trim();
  const newPassword = String(formData.get("newAccessPassword") ?? "").trim();
  const confirmPassword = String(formData.get("confirmAccessPassword") ?? "").trim();
  if (!currentPassword || !newUsername || !newPassword || !confirmPassword) {
    redirect("/admin?error=14");
  }
  if (newPassword.length < 6 || newPassword !== confirmPassword) {
    redirect("/admin?error=14");
  }

  const currentOk = await verifyAdminPassword(currentPassword);
  if (!currentOk) {
    redirect("/admin?error=14");
  }

  await ensureQuotaSettingsExists();
  await prisma.quotaSettings.update({
    where: { id: QUOTA_SETTINGS_ID },
    data: {
      adminUsername: newUsername,
      adminPasswordHash: hashSecret(newPassword),
    },
  });
  await logAdminEvent({
    action: "CREATE",
    entity: "ADMIN_ACCESS_USER",
    entityId: QUOTA_SETTINGS_ID,
    note: `Novo user de acesso criado: ${newUsername}`,
  });

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateAdminPassword(formData: FormData) {
  await assertAdmin();

  const currentPassword = String(formData.get("currentPasswordForPassword") ?? "").trim();
  const newPassword = String(formData.get("newPasswordOnly") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPasswordOnly") ?? "").trim();
  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect("/admin?error=15");
  }
  if (newPassword.length < 6 || newPassword !== confirmPassword) {
    redirect("/admin?error=15");
  }

  const currentOk = await verifyAdminPassword(currentPassword);
  if (!currentOk) {
    redirect("/admin?error=15");
  }

  await ensureQuotaSettingsExists();
  await prisma.quotaSettings.update({
    where: { id: QUOTA_SETTINGS_ID },
    data: { adminPasswordHash: hashSecret(newPassword) },
  });
  await logAdminEvent({
    action: "UPDATE",
    entity: "ADMIN_PASSWORD",
    entityId: QUOTA_SETTINGS_ID,
    note: "Palavra-passe do admin atualizada",
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
  await logAdminEvent({
    action: "UPDATE",
    entity: "CONSULT_PIN",
    entityId: QUOTA_SETTINGS_ID,
    note: "PIN da consulta pública atualizado",
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
  await logAdminEvent({
    action: "UPDATE",
    entity: "PUBLIC_NOTICE",
    entityId: QUOTA_SETTINGS_ID,
    note: note ? "Aviso público atualizado" : "Aviso público removido",
  });

  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}

export async function clearPublicNotice() {
  await assertAdmin();
  await ensureQuotaSettingsExists();
  await prisma.quotaSettings.update({
    where: { id: QUOTA_SETTINGS_ID },
    data: { publicNotice: null },
  });
  await logAdminEvent({
    action: "UPDATE",
    entity: "PUBLIC_NOTICE",
    entityId: QUOTA_SETTINGS_ID,
    note: "Aviso público removido",
  });
  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin");
}

function monthRangeUtc(monthKey: string): { start: Date; endExclusive: Date } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  return { start, endExclusive };
}

export async function closeMonthSnapshot(formData: FormData) {
  await assertAdmin();

  const raw = String(formData.get("snapshotMonthKey") ?? "").trim();
  const monthKey = raw ? parseMonthKey(raw) : currentMonthKeyUtc();
  if (!monthKey) {
    redirect("/admin?error=16");
  }

  const exists = await prisma.monthClosure.findUnique({
    where: { monthKey },
    select: { id: true },
  });
  if (exists) {
    redirect("/admin?error=16");
  }

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true },
  });
  const balances = await computeBalancesForUsers(users);

  let debtUsers = 0;
  let creditUsers = 0;
  let totalDebtCents = 0;
  let totalCreditCents = 0;
  for (const u of users) {
    const cents = balances.get(u.id)?.balanceCents ?? 0;
    if (cents > 0) {
      debtUsers += 1;
      totalDebtCents += cents;
    } else if (cents < 0) {
      creditUsers += 1;
      totalCreditCents += -cents;
    }
  }

  const { start, endExclusive } = monthRangeUtc(monthKey);
  const receivedAgg = await prisma.ledgerEntry.aggregate({
    where: {
      kind: "PAYMENT",
      createdAt: { gte: start, lt: endExclusive },
    },
    _sum: { deltaCents: true },
  });
  const paymentDelta = receivedAgg._sum.deltaCents ?? 0;
  const totalReceivedCents = paymentDelta < 0 ? -paymentDelta : 0;

  await prisma.monthClosure.create({
    data: {
      monthKey,
      totalUsers: users.length,
      debtUsers,
      creditUsers,
      totalDebtCents,
      totalCreditCents,
      totalReceivedCents,
    },
  });

  await logAdminEvent({
    action: "CREATE",
    entity: "MONTH_CLOSURE",
    entityId: monthKey,
    note: `Fecho mensal criado para ${monthKey}`,
  });

  revalidatePath("/admin");
  redirect("/admin");
}

export async function reopenMonthSnapshot(formData: FormData) {
  await assertAdmin();

  const monthRaw = String(formData.get("reopenMonthKey") ?? "").trim();
  const confirm = String(formData.get("reopenConfirm") ?? "").trim();
  const monthKey = parseMonthKey(monthRaw);
  if (!monthKey || confirm !== "REABRIR") {
    redirect("/admin?error=17");
  }

  await prisma.monthClosure.delete({
    where: { monthKey },
  });

  await logAdminEvent({
    action: "DELETE",
    entity: "MONTH_CLOSURE",
    entityId: monthKey,
    note: `Fecho mensal removido para ${monthKey}`,
  });

  revalidatePath("/admin");
  redirect("/admin");
}

export async function createEvent(formData: FormData) {
  await assertAdmin();

  const title = String(formData.get("eventTitle") ?? "").trim();
  const description = String(formData.get("eventDescription") ?? "").trim();
  const eventDateRaw = String(formData.get("eventDate") ?? "").trim();

  if (!title) {
    redirect("/admin/convivios?error=1");
  }

  const eventDate = eventDateRaw ? new Date(eventDateRaw) : null;
  const event = await prisma.event.create({
    data: {
      title,
      description: description || null,
      eventDate: eventDate && !Number.isNaN(eventDate.getTime()) ? eventDate : null,
      status: "OPEN",
    },
  });

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true },
  });
  if (users.length > 0) {
    await prisma.eventParticipant.createMany({
      data: users.map((u) => ({
        eventId: event.id,
        userId: u.id,
        status: "NO",
        splitProfile: "ALL",
      })),
    });
  }

  await logAdminEvent({
    action: "CREATE",
    entity: "EVENT",
    entityId: event.id,
    note: `Convívio criado: ${title}`,
  });

  revalidatePath("/admin/convivios");
  revalidatePath("/consulta");
  redirect("/admin/convivios");
}

export async function saveEventCosts(formData: FormData) {
  await assertAdmin();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const foodCents = parseAmountEurToCents(String(formData.get("foodEur") ?? "")) ?? 0;
  const drinkCents = parseAmountEurToCents(String(formData.get("drinkEur") ?? "")) ?? 0;
  const otherCents = parseAmountEurToCents(String(formData.get("otherEur") ?? "")) ?? 0;
  if (!eventId || foodCents < 0 || drinkCents < 0 || otherCents < 0) {
    redirect("/admin/convivios?error=2");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { foodCents, drinkCents, otherCents },
  });

  await logAdminEvent({
    action: "UPDATE",
    entity: "EVENT_COSTS",
    entityId: eventId,
    note: `Custos atualizados (F:${foodCents} B:${drinkCents} O:${otherCents})`,
  });

  revalidatePath("/admin/convivios");
  redirect("/admin/convivios");
}

export async function closeEventRegistrations(formData: FormData) {
  await assertAdmin();
  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) {
    redirect("/admin/convivios?error=3");
  }
  await prisma.event.update({
    where: { id: eventId },
    data: { status: "CLOSED" },
  });
  await logAdminEvent({
    action: "UPDATE",
    entity: "EVENT",
    entityId: eventId,
    note: "Inscrições encerradas",
  });
  revalidatePath("/admin/convivios");
  revalidatePath("/consulta");
  redirect("/admin/convivios");
}

export async function applyEventSettlement(formData: FormData) {
  await assertAdmin();
  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) {
    redirect("/admin/convivios?error=4");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      status: true,
      foodCents: true,
      drinkCents: true,
      otherCents: true,
      participants: {
        select: { userId: true, status: true, splitProfile: true },
      },
      charges: { select: { id: true }, take: 1 },
    },
  });
  if (!event || event.charges.length > 0) {
    redirect("/admin/convivios?error=4");
  }

  const split = computeEventSplit({
    participants: event.participants,
    foodCents: event.foodCents,
    drinkCents: event.drinkCents,
    otherCents: event.otherCents,
  });
  const userIds = [...split.keys()];
  if (userIds.length === 0) {
    redirect("/admin/convivios?error=4");
  }

  for (const userId of userIds) {
    const amountCents = split.get(userId) ?? 0;
    if (amountCents <= 0) continue;

    await prisma.ledgerEntry.create({
      data: {
        userId,
        deltaCents: amountCents,
        kind: "ADJUSTMENT",
        monthKey: null,
        note: `Convívio: ${event.title}`,
      },
    });
    await prisma.eventCharge.create({
      data: { eventId, userId, amountCents },
    });
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "SETTLED" },
  });

  await logAdminEvent({
    action: "CREATE",
    entity: "EVENT_SETTLEMENT",
    entityId: eventId,
    note: `Convívio liquidado: ${event.title}`,
  });

  revalidatePath("/admin/convivios");
  revalidatePath("/admin");
  revalidatePath("/consulta");
  redirect("/admin/convivios");
}
