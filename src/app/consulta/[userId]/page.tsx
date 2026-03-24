import Link from "next/link";
import { notFound } from "next/navigation";
import { balanceToneClass } from "@/lib/balance-display";
import {
  backfillMissingMonthlyCharges,
  computeBalanceDetailForUser,
  ledgerKindLabel,
} from "@/lib/balance";
import { PublicShell } from "@/components/PublicShell";
import { requireConsultaSession } from "@/lib/auth-consulta";
import { splitProfileLabel } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { updateEventParticipation } from "@/app/consulta/actions";

const eurFmt = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const dateTimeFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const card =
  "mx-auto w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm sm:rounded-3xl sm:p-8 dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-black/40";

const btnOutline =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

function ledgerKindBadge(kind: string) {
  if (kind === "CHARGE_MONTH") {
    return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }
  if (kind === "PAYMENT") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
}

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function ConsultaUserDetailPage({ params }: PageProps) {
  await requireConsultaSession();
  await backfillMissingMonthlyCharges();

  const { userId } = await params;
  const data = await computeBalanceDetailForUser(userId);
  if (!data) {
    notFound();
  }

  const {
    user,
    balanceCents,
    estimatedMonthsEquivalent,
    quotaNotConfigured,
    ledgerEntries,
  } = data;

  const b = balanceCents;
  const openEvents = await prisma.event.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      participants: {
        where: { userId },
        select: { status: true, splitProfile: true },
      },
    },
    take: 10,
  });

  return (
    <PublicShell>
      <main className={card}>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">
          Consulta pública
        </p>
        <h1 className="mt-3 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl dark:text-white">
          Saldo — {user.name}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          O saldo em euros é a referência oficial. A estimativa em meses usa a cota atual.
          Só leitura.
        </p>

        <div
          className={`mt-6 rounded-2xl border p-5 dark:border-slate-700 ${
            b > 0
              ? "border-red-200/90 bg-red-50/90 dark:border-red-900/50 dark:bg-red-950/25"
              : b < 0
                ? "border-emerald-200/90 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                : "border-slate-200/80 bg-slate-50/80 dark:bg-slate-800/40"
          }`}
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {b > 0
              ? "Dívida em falta"
              : b < 0
                ? "Crédito a favor"
                : "Saldo"}
          </p>
          <p className={`mt-1 text-2xl tabular-nums ${balanceToneClass(b)}`}>
            {b !== 0 ? eurFmt.format(Math.abs(b) / 100) : eurFmt.format(0)}
          </p>
          {!quotaNotConfigured && b > 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Estimativa: ~{estimatedMonthsEquivalent} mês(es) (referência).
            </p>
          ) : null}
        </div>

        {quotaNotConfigured ? (
          <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
            A administração ainda não definiu a cota mensal. O saldo mantém-se correto.
          </p>
        ) : null}

        {openEvents.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-700/80 dark:bg-slate-800/35">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              Convívios
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Indique se participa e como entra na divisão da conta.
            </p>
            <div className="mt-3 space-y-3">
              {openEvents.map((ev) => {
                const current = ev.participants[0];
                const currentStatus = current?.status ?? "NO";
                const currentProfile = current?.splitProfile ?? "ALL";
                return (
                  <form
                    key={ev.id}
                    action={updateEventParticipation}
                    className="rounded-xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-700/80 dark:bg-slate-900/35"
                  >
                    <input type="hidden" name="userId" value={userId} />
                    <input type="hidden" name="eventId" value={ev.id} />
                    <p className="font-medium text-slate-900 dark:text-slate-100">{ev.title}</p>
                    {ev.description ? (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{ev.description}</p>
                    ) : null}
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <select name="status" defaultValue={currentStatus} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950/40">
                        <option value="YES">Vou participar</option>
                        <option value="NO">Não vou</option>
                      </select>
                      <select
                        name="splitProfile"
                        defaultValue={currentProfile}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950/40"
                      >
                        <option value="ALL">Tudo</option>
                        <option value="FOOD_ONLY">Só comida</option>
                      </select>
                      <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                        Guardar
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Atual: {currentStatus === "YES" ? "Participa" : "Não participa"} ·{" "}
                      {splitProfileLabel(currentProfile)}
                    </p>
                  </form>
                );
              })}
            </div>
          </section>
        ) : null}

        {ledgerEntries.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
            Ainda não há lançamentos.
          </p>
        ) : (
          <>
            <ul
              className="mt-6 space-y-2 md:hidden"
              aria-label="Lançamentos"
            >
              {ledgerEntries.map((row) => (
                <li
                  key={row.id}
                  className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {dateTimeFmt.format(row.createdAt)}
                    </p>
                    <p
                      className={`shrink-0 text-sm ${balanceToneClass(row.deltaCents)}`}
                    >
                      {eurFmt.format(Math.abs(row.deltaCents) / 100)}
                    </p>
                  </div>
                  <p className="mt-2 font-medium text-slate-800 dark:text-slate-200">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ledgerKindBadge(row.kind)}`}
                    >
                      {ledgerKindLabel(row.kind)}
                    </span>
                    {row.deltaCents > 0 ? (
                      <span className="ml-1.5 text-xs font-normal text-red-600 dark:text-red-400">
                        (aumenta dívida)
                      </span>
                    ) : row.deltaCents < 0 ? (
                      <span className="ml-1.5 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                        (reduz dívida)
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                    Mês: {row.monthKey ?? "—"}
                  </p>
                  <p className="mt-2 break-words text-xs text-slate-600 dark:text-slate-400">
                    {row.note ?? "—"}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200/80 md:block dark:border-slate-700/80">
              <table className="w-full min-w-[360px] text-left text-sm">
                <thead className="bg-slate-100/90 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">Mês</th>
                    <th className="px-4 py-3 font-semibold">Valor (€)</th>
                    <th className="px-4 py-3 font-semibold">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                  {ledgerEntries.map((row) => (
                    <tr
                      key={row.id}
                      className="bg-white/90 text-slate-900 dark:bg-slate-900/30 dark:text-slate-100"
                    >
                      <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                        {dateTimeFmt.format(row.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ledgerKindBadge(row.kind)}`}
                        >
                          {ledgerKindLabel(row.kind)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {row.monthKey ?? "—"}
                      </td>
                      <td
                        className={`px-4 py-3 tabular-nums ${balanceToneClass(row.deltaCents)}`}
                      >
                        {eurFmt.format(Math.abs(row.deltaCents) / 100)}
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-slate-600 dark:text-slate-400">
                        {row.note ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-8">
          <Link href="/consulta" className={btnOutline}>
            Voltar à lista
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
