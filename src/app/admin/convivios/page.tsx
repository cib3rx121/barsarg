import Link from "next/link";
import {
  applyEventSettlement,
  closeEventRegistrations,
  createEvent,
  saveEventCosts,
} from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/auth-admin";
import { computeEventSplit, splitProfileLabel } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { MonthYearField } from "@/components/MonthYearField";
import { currentMonthKeyUtc, formatMonthKeyLongPt, monthKeyFromUtcDate } from "@/lib/month-keys";

const eurFmt = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const card =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-sm sm:rounded-3xl sm:p-6 dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-black/40";
const inpt =
  "min-h-12 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition duration-200 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-100 sm:text-sm";
const btnPrimary =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500";
const btnSecondary =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export default async function ConviviosAdminPage() {
  await requireAdminSession();

  const events = await prisma.event.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      participants: {
        include: { user: { select: { name: true } } },
      },
      charges: true,
    },
  });
  const currentMonth = currentMonthKeyUtc();
  const currentYear = new Date().getUTCFullYear();

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
            Crie anúncios de convívio, recolha participações e liquide a conta por perfis.
          </p>
          <div className="mt-4">
            <Link href="/admin" className={btnSecondary}>
              Voltar ao painel
            </Link>
          </div>
        </header>

        <section className={`mt-6 ${card}`}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Novo convívio
          </h2>
          <form action={createEvent} className="mt-4 grid gap-3">
            <input name="eventTitle" required placeholder="Título (ex.: Jantar de sexta)" className={inpt} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Mês do convívio
              </label>
              <MonthYearField
                idPrefix="new-event-month"
                name="eventMonthKey"
                required
                defaultValue={currentMonth}
                className={inpt}
                yearStart={currentYear - 3}
                yearEnd={currentYear + 3}
                showSelectionSummary={false}
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
          {events.length === 0 ? (
            <div className={card}>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sem convívios criados.</p>
            </div>
          ) : (
            events.map((event) => {
              const split = computeEventSplit({
                participants: event.participants.map((p) => ({
                  userId: p.userId,
                  status: p.status,
                  splitProfile: p.splitProfile,
                })),
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
                          Mês: {formatMonthKeyLongPt(monthKeyFromUtcDate(event.eventDate))}
                        </p>
                      ) : null}
                      {event.description ? (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{event.description}</p>
                      ) : null}
                    </div>
                  </div>

                  <form action={saveEventCosts} className="mt-4 grid gap-3 sm:grid-cols-4">
                    <input type="hidden" name="eventId" value={event.id} />
                    <input
                      name="foodEur"
                      defaultValue={(event.foodCents / 100).toFixed(2).replace(".", ",")}
                      className={inpt}
                      placeholder="Comida €"
                    />
                    <input
                      name="drinkEur"
                      defaultValue={(event.drinkCents / 100).toFixed(2).replace(".", ",")}
                      className={inpt}
                      placeholder="Bebida €"
                    />
                    <input
                      name="otherEur"
                      defaultValue={(event.otherCents / 100).toFixed(2).replace(".", ",")}
                      className={inpt}
                      placeholder="Outros €"
                    />
                    <button type="submit" className={btnSecondary}>
                      Guardar custos
                    </button>
                  </form>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <form action={closeEventRegistrations}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className={`${btnSecondary} w-full`}>
                        Encerrar inscrições
                      </button>
                    </form>
                    <form action={applyEventSettlement}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className={`${btnPrimary} w-full`}>
                        Liquidar e lançar no saldo
                      </button>
                    </form>
                  </div>

                  <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="bg-slate-100/90 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Associado</th>
                          <th className="px-3 py-2 font-semibold">Participa</th>
                          <th className="px-3 py-2 font-semibold">Perfil</th>
                          <th className="px-3 py-2 font-semibold">Valor previsto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
                        {event.participants.map((p) => (
                          <tr key={p.id} className="bg-white/90 dark:bg-slate-900/30">
                            <td className="px-3 py-2">{p.user.name}</td>
                            <td className="px-3 py-2">{p.status === "YES" ? "Sim" : "Não"}</td>
                            <td className="px-3 py-2">{splitProfileLabel(p.splitProfile)}</td>
                            <td className="px-3 py-2 tabular-nums">
                              {eurFmt.format((split.get(p.userId) ?? 0) / 100)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

