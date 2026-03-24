import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  backfillMissingMonthlyCharges,
  computeBalancesForUsers,
} from "@/lib/balance";
import {
  formatMonthKeyLongPt,
  monthKeyFromUtcDate,
} from "@/lib/month-keys";
import { PublicShell } from "@/components/PublicShell";
import { prisma } from "@/lib/prisma";

type ConsultaPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const eurFmt = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

function entryMonthLabel(entryDate: Date) {
  return formatMonthKeyLongPt(monthKeyFromUtcDate(entryDate));
}

const card =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm sm:rounded-3xl sm:p-8 dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-black/40";

const inpt =
  "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-100 sm:text-sm";

const btnPrimary =
  "touch-target inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500";

const btnOutline =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

const btnDark =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-emerald-600 dark:hover:bg-emerald-500";

export default async function ConsultaPage({ searchParams }: ConsultaPageProps) {
  const params = await searchParams;
  const hasError = params.error === "1";
  const cookieStore = await cookies();
  const consultSession = cookieStore.get("barsarg_consulta_session")?.value;

  async function validatePin(formData: FormData) {
    "use server";

    const pin = String(formData.get("pin") ?? "");
    const envPin = process.env.PUBLIC_CONSULT_PIN ?? "";

    if (!pin || pin !== envPin) {
      redirect("/consulta?error=1");
    }

    const currentCookies = await cookies();
    currentCookies.set("barsarg_consulta_session", "ok", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    redirect("/consulta");
  }

  async function logoutConsulta() {
    "use server";
    const currentCookies = await cookies();
    currentCookies.delete("barsarg_consulta_session");
    redirect("/consulta");
  }

  if (consultSession !== "ok") {
    return (
      <PublicShell>
        <div className="flex min-h-[calc(100dvh-6rem)] items-center justify-center py-6 sm:py-8">
          <main className={`w-full max-w-md ${card}`}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">
              Consulta pública
            </p>
            <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
              Acesso por PIN
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Introduza o PIN fornecido pela administração.
            </p>

            {hasError ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
                PIN incorreto. Tente novamente.
              </p>
            ) : null}

            <form action={validatePin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="pin"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  PIN
                </label>
                <input
                  id="pin"
                  name="pin"
                  type="password"
                  required
                  inputMode="numeric"
                  className={inpt}
                />
              </div>

              <button type="submit" className={btnPrimary}>
                Entrar
              </button>
            </form>
          </main>
        </div>
      </PublicShell>
    );
  }

  await backfillMissingMonthlyCharges();

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const balanceByUser = await computeBalancesForUsers(users);

  return (
    <PublicShell>
      <main className={`mx-auto w-full max-w-4xl ${card}`}>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">
          Consulta pública
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl dark:text-white">
          Resumo
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Associados ativos e saldo. Clique no nome para o detalhe.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <Link href="/" className={`${btnOutline} w-full sm:w-auto`}>
            Início
          </Link>
          <form action={logoutConsulta} className="w-full sm:w-auto">
            <button type="submit" className={`${btnDark} w-full`}>
              Terminar sessão
            </button>
          </form>
        </div>

        {users.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-6 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
            Ainda não há utilizadores ativos na lista.
          </p>
        ) : (
          <>
            <ul
              className="mt-8 space-y-2 md:hidden"
              aria-label="Associados e saldos"
            >
              {users.map((u) => {
                const d = balanceByUser.get(u.id);
                const b = d?.balanceCents ?? 0;
                const noQuotaCfg = d?.quotaNotConfigured
                  ? "Cota ainda não definida — meses estimados indisponíveis."
                  : null;
                return (
                  <li key={u.id}>
                    <Link
                      href={`/consulta/${u.id}`}
                      className="block rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-sm transition active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                            {u.name}
                          </span>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Entrada: {entryMonthLabel(u.entryDate)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tabular-nums text-sm font-semibold text-slate-900 dark:text-white">
                            {b > 0 ? (
                              eurFmt.format(b / 100)
                            ) : b < 0 ? (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                {eurFmt.format((-b) / 100)}
                              </span>
                            ) : (
                              eurFmt.format(0)
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {d && !d.quotaNotConfigured
                              ? `~${d.estimatedMonthsEquivalent} m.`
                              : "—"}
                          </p>
                        </div>
                      </div>
                      {noQuotaCfg ? (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                          {noQuotaCfg}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                          Ver detalhe →
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 hidden overflow-x-auto rounded-2xl border border-slate-200/80 md:block dark:border-slate-700/80">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-100/90 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Mês entrada</th>
                    <th className="px-4 py-3 font-semibold">Saldo</th>
                    <th className="px-4 py-3 font-semibold">Meses (estim.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                  {users.map((u) => {
                    const d = balanceByUser.get(u.id);
                    const b = d?.balanceCents ?? 0;
                    const noQuotaCfg = d?.quotaNotConfigured
                      ? "Cota ainda não definida — meses estimados indisponíveis."
                      : null;
                    return (
                      <tr
                        key={u.id}
                        className="bg-white/90 text-slate-900 transition-colors hover:bg-emerald-50/40 dark:bg-slate-900/30 dark:text-slate-100 dark:hover:bg-emerald-950/20"
                      >
                        <td className="px-4 py-3 font-medium">
                          <Link
                            href={`/consulta/${u.id}`}
                            className="text-emerald-800 underline decoration-slate-300 underline-offset-2 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                          >
                            {u.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                          {entryMonthLabel(u.entryDate)}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-medium">
                          {b > 0 ? (
                            eurFmt.format(b / 100)
                          ) : b < 0 ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              Crédito {eurFmt.format((-b) / 100)}
                            </span>
                          ) : (
                            eurFmt.format(0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          <span className="tabular-nums">
                            {d && !d.quotaNotConfigured
                              ? d.estimatedMonthsEquivalent
                              : "—"}
                          </span>
                          {noQuotaCfg ? (
                            <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                              {noQuotaCfg}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </PublicShell>
  );
}
