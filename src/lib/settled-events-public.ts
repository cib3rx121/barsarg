import { splitProfileLabel } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export type SettledEventPublicRow = {
  id: string;
  title: string;
  eventDate: Date | null;
  invoiceUrl: string | null;
  totalCents: number;
  participantRows: Array<{
    id: string;
    userId: string;
    name: string;
    amountCents: number;
    profileLabel: string;
  }>;
};

export async function fetchSettledEventsForPublicConsulta(): Promise<
  SettledEventPublicRow[]
> {
  let events: any[] = [];
  try {
    events = await prisma.event.findMany({
      where: { status: "SETTLED", publicConsultaSummary: true },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      include: {
        charges: {
          include: { user: { select: { name: true } } },
        },
        participants: {
          select: { userId: true, splitProfile: true },
        },
      },
    });
  } catch {
    // Compatibilidade: se a migração/coluna nova ainda não existir na BD,
    // não bloqueamos a consulta pública.
    events = await prisma.event.findMany({
      where: { status: "SETTLED" },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      include: {
        charges: {
          include: { user: { select: { name: true } } },
        },
        participants: {
          select: { userId: true, splitProfile: true },
        },
      },
    });
  }

  return events.map((ev) => {
    const totalCents = ev.foodCents + ev.drinkCents + ev.otherCents;
    const participantRows = [...ev.charges]
      .sort((a, b) => a.user.name.localeCompare(b.user.name, "pt"))
      .map((c) => {
        const part = ev.participants.find((p) => p.userId === c.userId);
        return {
          id: c.id,
          userId: c.userId,
          name: c.user.name,
          amountCents: c.amountCents,
          profileLabel: part ? splitProfileLabel(part.splitProfile) : "—",
        };
      });
    return {
      id: ev.id,
      title: ev.title,
      eventDate: ev.eventDate,
      invoiceUrl: ev.invoiceUrl,
      totalCents,
      participantRows,
    };
  });
}
