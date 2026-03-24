"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireConsultaSession } from "@/lib/auth-consulta";
import { prisma } from "@/lib/prisma";

export async function updateEventParticipation(formData: FormData) {
  await requireConsultaSession();

  const userId = String(formData.get("userId") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const splitProfile = String(formData.get("splitProfile") ?? "").trim();

  if (!userId || !eventId) {
    redirect("/consulta");
  }

  const normalizedStatus = status === "NO" ? "NO" : "YES";
  const normalizedProfile =
    splitProfile === "FOOD_ONLY" || splitProfile === "NO_DRINK" ? splitProfile : "ALL";

  await prisma.eventParticipant.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: {
      eventId,
      userId,
      status: normalizedStatus,
      splitProfile: normalizedProfile,
    },
    update: {
      status: normalizedStatus,
      splitProfile: normalizedProfile,
    },
  });

  revalidatePath(`/consulta/${userId}`);
  revalidatePath("/admin/convivios");
  redirect(`/consulta/${userId}`);
}

