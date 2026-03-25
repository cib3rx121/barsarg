import Link from "next/link";
import {
  applyEventSettlement,
  createEventGuestAdmin,
  deleteEventGuestAdmin,
  closeEventRegistrations,
  createEvent,
  deleteEvent,
  updateEventGuestAdmin,
  reopenEventRegistrations,
  saveEventCosts,
  updateEventParticipantAdmin,
} from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/auth-admin";
import {
  computeEventSplit,
  isParticipantYes,
  splitProfileLabel,
} from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { DayMonthYearField } from "@/components/DayMonthYearField";

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
const inpt =
  "min-h-12 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition duration-200 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-100 sm:text-sm";
const btnPrimary =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500";
const btnSecondary =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";

type ConviviosPageProps = {
  searchParams?: Promise<{ error?: string; msg?: string }>;
};

export default async function ConviviosAdminPage({ searchParams }: ConviviosPageProps) {
  await requireAdminSession();
  const params = searchParams ? await searchParams : {};
  const error = params.error ?? "";
  const detailMsg = params.msg ?? "";
  const currentYear = new Date().getUTCFullYear();
  const createEventError = error === "1";
  const saveCostsError = error === "2";
  const closeError = error === "3";
  const settlementError = error === "4";
  const settlementAlreadyError = error === "41";
  const settlementNoCostsError = error === "42";
  const settlementNoParticipantsError = error === "43";
  const settlementUnexpectedError = error === "50";
  const reopenError = error === "5";
  const deleteError = error === "6";
  const participantError = error === "7";

  const [usersCount, settledCount] = await Promise.all([
    prisma.user.count({ where: { active: true } }),
    prisma.event.count({ where: { status: "SETTLED" } }),
  ]);

  // Nota: evitamos selecionar todas as colunas por defeito.
  // Isto garante que, se a coluna nova (`publicConsultaSummary`) ainda não existir
  // na base (migração pendente), a página continua a carregar.
  const events = await prisma.event.findMany({
    orderBy: [{ status: "asc" }, { eventDate: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      eventDate: true,
      description: true,
      invoiceUrl: true,
      foodCents: true,
      drinkCents: true,
      otherCents: true,
      participants: {
        select: {
          id: true,
          userId: true,
          status: true,
          splitProfile: true,
          user: { select: { name: true } },
        },
      },
      guests: {
        select: {
          id: true,
          name: true,
          status: true,
          splitProfile: true,
        },
      },
    },
  });
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-emerald-50/35 to-slate-100 pb-20 dark:from-slate-950 dark:via-emerald-950/25 dark:to-slate-900">
      <div className="relative mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-10">
        <header className={card}>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">
            Administração
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
            Convívios
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Crie convívios, recolha respostas e liquide a conta de forma simples.
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Associados ativos: {usersCount} · Convívios liquidados: {settledCount}
          </p>
          <div className="mt-4">
            <Link href="/admin" className={btnSecondary}>
              Voltar ao painel
            </Link>
          </div>
        </header>

        <section id="novo-convivio" className={`mt-6 ${card}`}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Novo convívio
          </h2>
          {createEventError ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Não foi possível criar o convívio. Confirma o título e a data.
            </p>
          ) : null}
          <form action={createEvent} className="mt-4 grid gap-3">
            <input name="eventTitle" required placeholder="Título (ex.: Jantar de sexta)" className={inpt} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Dia do convívio
              </label>
              <DayMonthYearField
                idPrefix="new-event-date"
                name="eventDate"
                required
                className={inpt}
                yearStart={currentYear - 3}
                yearEnd={currentYear + 3}
              />
            </div>
            <textarea
              name="eventDescription"
              rows={3}
              className={`${inpt} min-h-[7rem] resize-y`}
              placeholder="Anúncio/descrição do convívio..."
            />
            <button type="submit" className={btnPrimary}>
              Criar convívio
            </button>
          </form>
        </section>

        <section className="mt-6 space-y-4">
          {saveCostsError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Não foi possível guardar custos/comprovativo. Confirma valores, ficheiro (imagem/PDF até 10MB) e token `BLOB_READ_WRITE_TOKEN`.
            </p>
          ) : null}
          {closeError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Não foi possível encerrar inscrições. Tenta novamente.
            </p>
          ) : null}
          {reopenError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Não foi possível reabrir inscrições. Tenta novamente.
            </p>
          ) : null}
          {deleteError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Não foi possível eliminar o convívio. Escreve APAGAR para confirmar.
            </p>
          ) : null}
          {participantError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Não foi possível atualizar a inscrição de participante.
            </p>
          ) : null}
          {settlementError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Não foi possível fechar contas. Tenta novamente ou contacta o suporte técnico.
            </p>
          ) : null}
          {settlementAlreadyError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
              Este convívio já tem contas fechadas (não é possível repetir).
            </p>
          ) : null}
          {settlementNoCostsError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Guarda primeiro os custos (total ou categorias) com valor superior a zero.
            </p>
          ) : null}
          {settlementNoParticipantsError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Não há ninguém com “participa” para dividir. Confirma as inscrições (pelo menos um “Sim”).
            </p>
          ) : null}
          {settlementUnexpectedError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Erro ao fechar contas do convívio: {detailMsg}
            </p>
          ) : null}
          {events.length === 0 ? (
            <div className={card}>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sem convívios criados.</p>
            </div>
          ) : (
            events.map((event) => {
              const yesCount = event.participants.filter((p) =>
                isParticipantYes(p.status),
              ).length;
              const yesGuestsCount = event.guests.filter((g) =>
                isParticipantYes(g.status),
              ).length;
              const totalYes = yesCount + yesGuestsCount;
              const split = computeEventSplit({
                participants: [
                  ...event.participants.map((p) => ({
                    participantId: p.userId,
                    status: p.status,
                    splitProfile: p.splitProfile,
                  })),
                  ...event.guests.map((g) => ({
                    participantId: g.id,
                    status: g.status,
                    splitProfile: g.splitProfile,
                  })),
                ],
                foodCents: event.foodCents,
                drinkCents: event.drinkCents,
                otherCents: event.otherCents,
              });

              return (
                <article key={event.id} className={card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {event.title}
                      </h3>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Estado: {event.status}
                      </p>
                      {event.eventDate ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Data: {dateFmt.format(event.eventDate)}
                        </p>
                      ) : null}
                      {event.description ? (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{event.description}</p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-600 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-300">
                      <p>
                        <span className="font-semibold">Inscritos:</span> {yesCount}{" "}
                        <span className="ml-2 font-semibold">Convidados:</span> {yesGuestsCount}
                      </p>
                      <p>
                        <span className="font-semibold">Total:</span>{" "}
                        {eurFmt.format((event.foodCents + event.drinkCents + event.otherCents) / 100)}
                      </p>
                      <p>
                        <span className="font-semibold">Médio:</span>{" "}
                        {totalYes > 0
                          ? eurFmt.format((event.foodCents + event.drinkCents + event.otherCents) / totalYes / 100)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {event.status === "SETTLED" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/convivios/${event.id}/resumo`}
                        className={`${btnSecondary} inline-flex`}
                      >
                        Ver resumo para partilhar
                      </Link>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Consulta pública: disponível (PIN)
                      </span>
                    </div>
                  ) : null}

                  <details className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 md:hidden dark:border-slate-700/80 dark:bg-slate-800/35">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Custos e ações
                    </summary>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Expande para editar custos, inscrições e liquidação.
                    </p>
                    <form action={saveEventCosts} encType="multipart/form-data" className="mt-3 grid gap-3">
                      <input type="hidden" name="eventId" value={event.id} />
                      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
                        <p className="font-semibold">Modo rápido (recomendado): Total único</p>
                      </div>
                      <input
                        name="totalEur"
                        className={inpt}
                        placeholder="Total único € (ex.: 85,00)"
                      />
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Comprovativo (imagem/PDF)
                        </label>
                        <input
                          name="invoiceFile"
                          type="file"
                          accept="image/*,application/pdf"
                          className={inpt}
                        />
                        {event.invoiceUrl ? (
                          <a
                            href={event.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
                          >
                            Ver comprovativo atual
                          </a>
                        ) : null}
                        <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <input type="checkbox" name="clearInvoice" className="h-4 w-4" />
                          Remover comprovativo atual
                        </label>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Comida (€)
                        </label>
                        <input
                          name="foodEur"
                          defaultValue={(event.foodCents / 100).toFixed(2).replace(".", ",")}
                          className={inpt}
                          placeholder="Ex.: 45,00"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Bebida (€)
                        </label>
                        <input
                          name="drinkEur"
                          defaultValue={(event.drinkCents / 100).toFixed(2).replace(".", ",")}
                          className={inpt}
                          placeholder="Ex.: 30,00"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Outros (€)
                        </label>
                        <input
                          name="otherEur"
                          defaultValue={(event.otherCents / 100).toFixed(2).replace(".", ",")}
                          className={inpt}
                          placeholder="Ex.: 10,00"
                        />
                      </div>
                      <button type="submit" className={btnSecondary}>
                        Guardar custos
                      </button>
                    </form>
                    <div className="mt-3 grid gap-2">
                      <form action={closeEventRegistrations}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button type="submit" className={`${btnSecondary} w-full`}>
                          Encerrar inscrições
                        </button>
                      </form>
                      <form action={reopenEventRegistrations}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button type="submit" className={`${btnSecondary} w-full`}>
                          Reabrir inscrições
                        </button>
                      </form>
                      <form action={applyEventSettlement}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button type="submit" className={`${btnPrimary} w-full`}>
                          Fechar contas do convívio
                        </button>
                      </form>
                    </div>
                  </details>

                  <div className="hidden md:block">
                  <form action={saveEventCosts} encType="multipart/form-data" className="mt-4 grid gap-3 sm:grid-cols-4">
                    <input type="hidden" name="eventId" value={event.id} />
                    <div className="sm:col-span-4 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
                      <p className="font-semibold">Modo rápido (recomendado): Total único</p>
                      <p className="mt-1">
                        Preencha apenas o total para dividir de forma simples pelos inscritos.
                        Se preencher o total, os campos detalhados abaixo são ignorados.
                      </p>
                    </div>
                    <input
                      name="totalEur"
                      className={`${inpt} sm:col-span-2`}
                      placeholder="Total único € (ex.: 85,00)"
                    />
                    <div className="sm:col-span-2 flex items-center text-xs text-slate-500 dark:text-slate-400">
                      Use os campos abaixo só quando quiser separar por categoria.
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Comprovativo (imagem/PDF)
                      </label>
                      <input
                        name="invoiceFile"
                        type="file"
                        accept="image/*,application/pdf"
                        className={inpt}
                        aria-label="Ficheiro de comprovativo"
                      />
                      {event.invoiceUrl ? (
                        <a
                          href={event.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
                        >
                          Ver comprovativo atual
                        </a>
                      ) : null}
                      <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <input type="checkbox" name="clearInvoice" className="h-4 w-4" />
                        Remover comprovativo atual
                      </label>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Comida (€)
                      </label>
                      <input
                        name="foodEur"
                        defaultValue={(event.foodCents / 100).toFixed(2).replace(".", ",")}
                        className={inpt}
                        placeholder="Ex.: 45,00"
                        aria-label="Custo de comida em euros"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Bebida (€)
                      </label>
                      <input
                        name="drinkEur"
                        defaultValue={(event.drinkCents / 100).toFixed(2).replace(".", ",")}
                        className={inpt}
                        placeholder="Ex.: 30,00"
                        aria-label="Custo de bebida em euros"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Outros (€)
                      </label>
                      <input
                        name="otherEur"
                        defaultValue={(event.otherCents / 100).toFixed(2).replace(".", ",")}
                        className={inpt}
                        placeholder="Ex.: 10,00"
                        aria-label="Outros custos em euros"
                      />
                    </div>
                    <button type="submit" className={btnSecondary}>
                      Guardar custos
                    </button>
                    <p className="sm:col-span-4 text-xs text-slate-500 dark:text-slate-400">
                      Dica: use o <span className="font-semibold">Total único</span> para registo rápido.
                      Use <span className="font-semibold">Comida/Bebida/Outros</span> apenas quando quiser
                      separar custos.
                    </p>
                  </form>
                  </div>

                  <div className="mt-4 hidden gap-2 sm:grid-cols-2 md:grid">
                    <form action={closeEventRegistrations}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className={`${btnSecondary} w-full`}>
                        Encerrar inscrições
                      </button>
                    </form>
                    <form action={reopenEventRegistrations}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className={`${btnSecondary} w-full`}>
                        Reabrir inscrições
                      </button>
                    </form>
                    <form action={applyEventSettlement}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className={`${btnPrimary} w-full sm:col-span-2`}>
                        Fechar contas do convívio
                      </button>
                    </form>
                  </div>

                  <div className="mt-3 grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 sm:grid-cols-3 dark:border-slate-700/80 dark:bg-slate-800/35">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Participa (YES)
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {totalYes}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Total custos
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {eurFmt.format((event.foodCents + event.drinkCents + event.otherCents) / 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Valor médio / inscrito
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {totalYes > 0
                          ? eurFmt.format(
                              (event.foodCents + event.drinkCents + event.otherCents) / totalYes / 100,
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <details className="mt-4 rounded-xl border border-red-200/80 bg-red-50/70 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                    <summary className="cursor-pointer text-sm font-semibold text-red-800 dark:text-red-200">
                      Zona de risco: eliminar convívio
                    </summary>
                    <p className="mt-2 text-xs text-red-700 dark:text-red-300">
                      Use apenas se o convívio não se realizar. Escreva APAGAR para confirmar.
                    </p>
                    <form action={deleteEvent} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input type="hidden" name="eventId" value={event.id} />
                      <input
                        name="deleteConfirm"
                        type="text"
                        placeholder="APAGAR"
                        className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm dark:border-red-900/50 dark:bg-slate-900/50"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-300 bg-red-100 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-200 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/50"
                      >
                        Eliminar convívio
                      </button>
                    </form>
                  </details>

                  <div className="mt-5 hidden overflow-x-auto rounded-xl border border-slate-200/80 md:block dark:border-slate-700/80">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="bg-slate-100/90 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Associado</th>
                          <th className="px-3 py-2 font-semibold">Participa</th>
                          <th className="px-3 py-2 font-semibold">Perfil</th>
                          <th className="px-3 py-2 font-semibold">Editar inscrição</th>
                          <th className="px-3 py-2 font-semibold">Valor previsto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
                        {event.participants.map((p) => (
                          <tr key={p.id} className="bg-white/90 dark:bg-slate-900/30">
                            <td className="px-3 py-2">{p.user.name}</td>
                            <td className="px-3 py-2">{p.status === "YES" ? "Sim" : "Não"}</td>
                            <td className="px-3 py-2">{splitProfileLabel(p.splitProfile)}</td>
                            <td className="px-3 py-2">
                              <form action={updateEventParticipantAdmin} className="flex flex-wrap items-center gap-1.5">
                                <input type="hidden" name="eventId" value={event.id} />
                                <input type="hidden" name="userId" value={p.userId} />
                                <select
                                  name="status"
                                  defaultValue={p.status}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900/40"
                                >
                                  <option value="YES">Sim</option>
                                  <option value="NO">Não</option>
                                </select>
                                <select
                                  name="splitProfile"
                                  defaultValue={p.splitProfile}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900/40"
                                >
                                  <option value="ALL">Tudo</option>
                                  <option value="FOOD_ONLY">Só comida</option>
                                </select>
                                <button
                                  type="submit"
                                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                                >
                                  Guardar
                                </button>
                              </form>
                            </td>
                            <td className="px-3 py-2 tabular-nums">
                              {eurFmt.format((split.get(p.userId) ?? 0) / 100)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <details className="mt-4 rounded-xl border border-slate-200/80 bg-white/80 p-3 md:hidden dark:border-slate-700/80 dark:bg-slate-900/35">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Participantes e valores
                    </summary>
                    <div className="mt-3 space-y-2">
                      {event.participants.map((p) => (
                        <div key={p.id} className="rounded-lg border border-slate-200/80 p-2 dark:border-slate-700/80">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {p.status === "YES" ? "Participa" : "Não participa"} · {splitProfileLabel(p.splitProfile)} ·{" "}
                            {eurFmt.format((split.get(p.userId) ?? 0) / 100)}
                          </p>
                        </div>
                      ))}
                      {event.guests.length > 0
                        ? event.guests.map((g) => (
                            <div
                              key={g.id}
                              className="rounded-lg border border-slate-200/80 p-2 dark:border-slate-700/80"
                            >
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {g.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {g.status === "YES" ? "Participa" : "Não participa"} ·{" "}
                                {splitProfileLabel(g.splitProfile)} ·{" "}
                                {eurFmt.format((split.get(g.id) ?? 0) / 100)}
                              </p>
                            </div>
                          ))
                        : null}
                    </div>
                  </details>

                  <details className="mt-4 rounded-xl border border-slate-200/80 bg-white/80 p-3 md:hidden dark:border-slate-700/80 dark:bg-slate-900/35">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Convidados (sem conta)
                    </summary>
                    {event.status === "SETTLED" ? (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        As contas já estão fechadas. Não é possível alterar convidados.
                      </p>
                    ) : (
                      <>
                        <form action={createEventGuestAdmin} className="mt-3 grid gap-3">
                          <input type="hidden" name="eventId" value={event.id} />
                          <input
                            name="guestName"
                            required
                            placeholder="Nome do convidado (ex.: Convidado 1)"
                            className={inpt}
                          />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <select
                              name="status"
                              defaultValue="YES"
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950/40"
                            >
                              <option value="YES">Participa</option>
                              <option value="NO">Não participa</option>
                            </select>
                            <select
                              name="splitProfile"
                              defaultValue="ALL"
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950/40"
                            >
                              <option value="ALL">Tudo</option>
                              <option value="FOOD_ONLY">Só comida</option>
                            </select>
                          </div>
                          <button type="submit" className={`${btnSecondary} w-full`}>
                            Adicionar convidado
                          </button>
                        </form>

                        {event.guests.length > 0 ? (
                          <div className="mt-4 space-y-3">
                            {event.guests.map((g) => (
                              <div
                                key={g.id}
                                className="rounded-lg border border-slate-200/80 p-2 dark:border-slate-700/80"
                              >
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                  Valor previsto:{" "}
                                  {eurFmt.format((split.get(g.id) ?? 0) / 100)}
                                </p>
                                <form action={updateEventGuestAdmin} className="mt-2 grid gap-2">
                                  <input type="hidden" name="eventId" value={event.id} />
                                  <input type="hidden" name="guestId" value={g.id} />
                                  <input
                                    name="guestName"
                                    defaultValue={g.name}
                                    required
                                    className={inpt}
                                  />
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <select
                                      name="status"
                                      defaultValue={g.status}
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950/40"
                                    >
                                      <option value="YES">Participa</option>
                                      <option value="NO">Não participa</option>
                                    </select>
                                    <select
                                      name="splitProfile"
                                      defaultValue={g.splitProfile}
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950/40"
                                    >
                                      <option value="ALL">Tudo</option>
                                      <option value="FOOD_ONLY">Só comida</option>
                                    </select>
                                  </div>
                                  <button type="submit" className={btnSecondary}>
                                    Guardar convidado
                                  </button>
                                </form>
                                <form
                                  action={deleteEventGuestAdmin}
                                  className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]"
                                >
                                  <input type="hidden" name="eventId" value={event.id} />
                                  <input type="hidden" name="guestId" value={g.id} />
                                  <input
                                    name="deleteConfirm"
                                    placeholder="APAGAR"
                                    className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm dark:border-red-900/50 dark:bg-slate-900/50"
                                  />
                                  <button
                                    type="submit"
                                    className="rounded-lg border border-red-300 bg-red-100 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-200 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/50"
                                  >
                                    Remover
                                  </button>
                                </form>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                  </details>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

