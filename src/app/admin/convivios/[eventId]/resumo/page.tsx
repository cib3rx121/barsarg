import Link from "next/link";
import { notFound } from "next/navigation";
import { setEventPublicConsultaSummary } from "@/app/admin/actions";
import { CopyTextButton } from "@/components/CopyTextButton";
import { requireAdminSession } from "@/lib/auth-admin";
import { splitProfileLabel } from "@/lib/events";
import { prisma } from "@/lib/prisma";

const eurFmt = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});
const dateFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const card =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-sm sm:rounded-3xl sm:p-6 dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-black/40";
const btnSecondary =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";
const btnPrimaryEm =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500";

type PageProps = {
  params: Promise<{ eventId: string }>;
};

type EventResumoDbRow = {
  id: string;
  title: string;
  status: string;
  eventDate: Date | null;
  invoiceUrl: string | null;
  foodCents: number;
  drinkCents: number;
  otherCents: number;
  publicConsultaSummary?: boolean;
  charges: Array<{
    id: string;
    userId: string;
    amountCents: number;
    user: { name: string };
  }>;
  participants: Array<{
    userId: string;
    splitProfile: string;
    user: { name: string };
  }>;
};

function buildShareText(input: {
  title: string;
  eventDateLabel: string | null;
  totalLabel: string;
  invoiceLine: string | null;
  consultaLine: string | null;
  lines: Array<{ name: string; amount: string; profile: string }>;
}): string {
  const headerParts = [
    `Convívio: ${input.title}`,
    input.eventDateLabel ? `Data: ${input.eventDateLabel}` : null,
    `Total de custos: ${input.totalLabel}`,
    input.invoiceLine,
    input.consultaLine,
  ].filter(Boolean);
  const header = headerParts.join("\n");
  const intro = "Valor por participante (lançado no saldo):";
  const body = input.lines
    .map((row) => `- ${row.name}: ${row.amount} (${row.profile})`)
    .join("\n");

  return `${header}\n\n${intro}\n${body}`;
}

export default async function ConvivioResumoPage({ params }: PageProps) {
  await requireAdminSession();
  const { eventId } = await params;

  let event: EventResumoDbRow | null = null;
  try {
    const found = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        charges: {
          include: {
            user: { select: { name: true } },
          },
        },
        participants: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });
    event = found as unknown as EventResumoDbRow | null;
  } catch {
    // Compatibilidade: se a migração da coluna nova ainda não existir na BD,
    // a query falha. Fazemos fallback sem depender do campo.
    const found = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        status: true,
        eventDate: true,
        invoiceUrl: true,
        foodCents: true,
        drinkCents: true,
        otherCents: true,
        charges: {
          select: {
            id: true,
            userId: true,
            amountCents: true,
            user: { select: { name: true } },
          },
        },
        participants: {
          select: {
            userId: true,
            splitProfile: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    if (found) {
      (found as unknown as EventResumoDbRow).publicConsultaSummary = true;
    }

    event = found as unknown as EventResumoDbRow | null;
  }

  if (!event) {
    notFound();
  }

  const totalCents = event.foodCents + event.drinkCents + event.otherCents;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const consultaLine =
    baseUrl.length > 0 ? `Consulta pública (saldo): ${baseUrl}/consulta` : null;

  const chargesSorted = [...event.charges].sort((a, b) =>
    a.user.name.localeCompare(b.user.name, "pt"),
  );

  const rows = chargesSorted.map((c) => {
    const part = event.participants.find((p) => p.userId === c.userId);
    return {
      id: c.id,
      name: c.user.name,
      amountCents: c.amountCents,
      profile: part ? splitProfileLabel(part.splitProfile) : "—",
    };
  });

  const eventDateLabel = event.eventDate
    ? dateFmt.format(event.eventDate)
    : null;

  const invoiceLine = event.invoiceUrl
    ? `Comprovativo / fatura: ${event.invoiceUrl}`
    : null;

  const shareText = buildShareText({
    title: event.title,
    eventDateLabel,
    totalLabel: eurFmt.format(totalCents / 100),
    invoiceLine,
    consultaLine,
    lines: rows.map((r) => ({
      name: r.name,
      amount: eurFmt.format(r.amountCents / 100),
      profile: r.profile,
    })),
  });

  const isSettled = event.status === "SETTLED";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-emerald-50/35 to-slate-100 pb-20 dark:from-slate-950 dark:via-emerald-950/25 dark:to-slate-900">
      <div className="relative mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-10">
        <header className={card}>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">
            Resumo do convívio
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
            {event.title}
          </h1>
          {!isSettled ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
              Este convívio ainda não tem contas fechadas. O resumo completo fica disponível depois de
              fechares contas.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Usa o texto abaixo para enviar por WhatsApp ou email aos participantes.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/convivios" className={btnSecondary}>
              Voltar aos convívios
            </Link>
          </div>
        </header>

        <section className={`mt-6 ${card}`}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dados</h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            {eventDateLabel ? (
              <div className="flex flex-wrap gap-2">
                <dt className="font-medium text-slate-500 dark:text-slate-400">Data</dt>
                <dd>{eventDateLabel}</dd>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <dt className="font-medium text-slate-500 dark:text-slate-400">Total custos</dt>
              <dd className="tabular-nums">{eurFmt.format(totalCents / 100)}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="font-medium text-slate-500 dark:text-slate-400">Estado</dt>
              <dd>{event.status}</dd>
            </div>
            {event.invoiceUrl ? (
              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-2">
                <dt className="font-medium text-slate-500 dark:text-slate-400">Comprovativo</dt>
                <dd>
                  <a
                    href={event.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-600 dark:text-emerald-300"
                  >
                    Abrir fatura / imagem
                  </a>
                </dd>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sem comprovativo carregado.
              </p>
            )}
          </dl>
        </section>

        {isSettled ? (
          <section className={`mt-6 ${card}`}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Consulta pública (PIN)
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Quem tiver acesso à consulta pública vê este resumo (com lista e comprovativo) até ocultares.
              Continua a poder usar o texto para partilhar à parte.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
              Estado:{" "}
              {event.publicConsultaSummary ? (
                <span className="text-emerald-700 dark:text-emerald-400">visível</span>
              ) : (
                <span className="text-slate-600 dark:text-slate-400">oculto</span>
              )}
            </p>
            <div className="mt-4">
              {event.publicConsultaSummary ? (
                <form action={setEventPublicConsultaSummary}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="visible" value="0" />
                  <button type="submit" className={btnSecondary}>
                    Ocultar da consulta pública
                  </button>
                </form>
              ) : (
                <form action={setEventPublicConsultaSummary}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="visible" value="1" />
                  <button type="submit" className={btnPrimaryEm}>
                    Mostrar na consulta pública
                  </button>
                </form>
              )}
            </div>
          </section>
        ) : null}

        {isSettled && rows.length > 0 ? (
          <section className={`mt-6 ${card}`}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Participantes e valores
            </h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead className="bg-slate-100/90 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nome</th>
                    <th className="px-3 py-2 font-semibold">Valor</th>
                    <th className="px-3 py-2 font-semibold">Perfil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                  {rows.map((r) => (
                    <tr key={r.id} className="bg-white/90 dark:bg-slate-900/30">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {eurFmt.format(r.amountCents / 100)}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.profile}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {isSettled ? (
          <section className={`mt-6 ${card}`}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Texto para partilhar
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Copia e cola no grupo ou mensagem privada.
            </p>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200/80 bg-slate-50/90 p-4 text-xs text-slate-800 dark:border-slate-700/80 dark:bg-slate-800/50 dark:text-slate-200">
              {shareText}
            </pre>
            <div className="mt-4">
              <CopyTextButton
                text={shareText}
                className="touch-target inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 sm:w-auto"
              />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
