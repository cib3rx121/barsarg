import { prisma } from "@/lib/prisma";

export const QUOTA_SETTINGS_ID = "default";

export async function getGlobalQuotaCents(): Promise<number | null> {
  const row = await prisma.quotaSettings.findUnique({
    where: { id: QUOTA_SETTINGS_ID },
  });
  return row?.amountCents ?? null;
}
