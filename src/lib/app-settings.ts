import { prisma } from "@/lib/prisma";
import { QUOTA_SETTINGS_ID } from "@/lib/quota";
import { verifySecret } from "@/lib/secret-hash";

export async function getQuotaSettingsRow() {
  return prisma.quotaSettings.findUnique({
    where: { id: QUOTA_SETTINGS_ID },
  });
}

export async function ensureQuotaSettingsExists() {
  const row = await getQuotaSettingsRow();
  if (row) return row;
  return prisma.quotaSettings.create({
    data: {
      id: QUOTA_SETTINGS_ID,
      amountCents: 0,
    },
  });
}

export async function resolveAdminUsername(): Promise<string> {
  const row = await getQuotaSettingsRow();
  if (row?.adminUsername) return row.adminUsername;
  return process.env.ADMIN_USERNAME ?? "";
}

export async function verifyAdminPassword(rawPassword: string): Promise<boolean> {
  const row = await getQuotaSettingsRow();
  if (row?.adminPasswordHash) {
    return verifySecret(rawPassword, row.adminPasswordHash);
  }
  const envPassword = process.env.ADMIN_PASSWORD ?? "";
  return rawPassword === envPassword;
}

export async function verifyConsultaPin(rawPin: string): Promise<boolean> {
  const row = await getQuotaSettingsRow();
  if (row?.consultaPinHash) {
    return verifySecret(rawPin, row.consultaPinHash);
  }
  const envPin = process.env.PUBLIC_CONSULT_PIN ?? "";
  return rawPin === envPin;
}

