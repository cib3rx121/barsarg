import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createUser,
  recordPayment,
  saveGlobalQuota,
  updateUserChargeStart,
  waiveMonthRange,
} from "./actions";
import {
  backfillMissingMonthlyCharges,
  computeBalancesForUsers,
  firstChargeMonthKey,
} from "@/lib/balance";
import { formatMonthKeyLongPt } from "@/lib/month-keys";
import { requireAdminSession } from "@/lib/auth-admin";
import { prisma } from "@/lib/prisma";
import { QUOTA_SETTINGS_ID } from "@/lib/quota";

type AdminPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const eurFmt = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const dateFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const navLinkClass =
  "inline-flex items-center justify-center rounded-full border border-[#8b9678] bg-[#f5f1e4] px-4 py-2 text-sm font-medium text-[#2f3a2d] shadow-sm transition hover:bg-[#ece8da] dark:border-[#6b775d] dark:bg-[#2a3528] dark:text-[#e8e3d3] dark:hover:bg-[#3a4538]";

const sectionClass = "scroll-mt-28";

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdminSession();
  await backfillMissingMonthlyCharges();

  const params = await searchParams;
  const hasUserFormError = params.error === "1";
  const hasQuotaFormError = params.error === "2";
  const billingErr = params.error;
  const hasChargeStartBeforeEntry = billingErr === "8";
  const hasBillingFormError = billingErr === "7";
  const payErr = params.error;
  const payErrorMessage =
    payErr === "4"
      ? "Escolhe utilizador, indica o valor pago (EUR) e, se preencheres o mes, usa o formato AAAA-MM."
      : null;

  const [users, quotaRow] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.quotaSettings.findUnique({
      where: { id: QUOTA_SETTINGS_ID },
    }),
  ]);

  const balanceByUser = await computeBalancesForUsers(users);

  const quotaDefaultDisplay = quotaRow
    ? (quotaRow.amountCents / 100).toFixed(2).replace(".", ",")
    : "";

  async function logout() {
    "use server";
    const currentCookies = await cookies();
    currentCookies.delete("barsarg_admin_session");
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#f2efe2] px-4 py-8 pb-16 dark:bg-[#1a2119]">
      <div className="mx-auto w-full max-w-3xl">
        <header className="rounded-2xl border border-[#7f8a6a] bg-[#fcfbf6] p-6 shadow-sm dark:border-[#647157] dark:bg-[#202a20]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f7d5a] dark:text-[#b7c29d]">
            Bar de Sargentos
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#2f3a2d] dark:text-[#e8e3d3]">
            Painel de administracao
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#4a5644] dark:text-[#c5cfb2]">
            Tres passos: define a <strong className="font-semibold">cota</strong>, gere a{" "}
            <strong className="font-semibold">malta</strong>, regista{" "}
            <strong className="font-semibold">pagamentos</strong> (o saldo em euros e a
            referencia; os meses sao uma estimativa).
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/" className={navLinkClass}>
              Inicio
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex rounded-full bg-[#2f3b2f] px-4 py-2 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        <nav
          className="sticky top-4 z-10 mt-6 flex flex-wrap gap-2 rounded-2xl border border-[#c4d1b3] bg-[#fcfbf6]/95 p-3 shadow-sm backdrop-blur dark:border-[#4f5a45] dark:bg-[#202a20]/95"
          aria-label="Secoes do painel"
        >
          <a href="#cota" className={navLinkClass}>
            1. Cota
          </a>
          <a href="#malta" className={navLinkClass}>
            2. Malta
          </a>
          <a href="#pagamentos" className={navLinkClass}>
            3. Pagamentos
          </a>
          <a href="#ausencias" className={navLinkClass}>
            4. Ausencias
          </a>
        </nav>

        {/* 1. Cota unica */}
        <section
          id="cota"
          className={`${sectionClass} mt-8 rounded-2xl border border-[#7f8a6a] bg-[#fcfbf6] p-6 shadow-sm dark:border-[#647157] dark:bg-[#202a20]`}
        >
          <h2 className="text-lg font-semibold text-[#2f3a2d] dark:text-[#e8e3d3]">
            Cota mensal
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#4a5644] dark:text-[#c5cfb2]">
            Um unico valor em euros aplica-se a <strong>todos</strong> os meses (cargas
            mensais e estimativa de &quot;meses em falta&quot;). O saldo real vem dos
            lancamentos.
          </p>

          {quotaRow ? (
            <div className="mt-4 rounded-xl border border-[#c4d1b3] bg-[#f8f6ee] px-4 py-3 dark:border-[#4f5a45] dark:bg-[#273126]">
              <p className="text-xs font-medium uppercase tracking-wide text-[#6f7d5a] dark:text-[#b7c29d]">
                Valor actual
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[#2f3a2d] dark:text-[#e8e3d3]">
                {eurFmt.format(quotaRow.amountCents / 100)}
              </p>
              <p className="mt-1 text-xs text-[#4a5644] dark:text-[#c5cfb2]">
                Actualizado em {dateTimeFmt.format(quotaRow.updatedAt)}
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-amber-700/40 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
              Ainda nao ha cota definida. Preenche abaixo para comecar.
            </p>
          )}

          {hasQuotaFormError ? (
            <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
              Indica um valor maior que zero (ex.: 12,50).
            </p>
          ) : null}

          <form action={saveGlobalQuota} className="mt-5 space-y-4">
            <div className="max-w-xs">
              <label
                htmlFor="amountEur"
                className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
              >
                Valor (EUR) por mes
              </label>
              <input
                id="amountEur"
                name="amountEur"
                type="text"
                inputMode="decimal"
                required
                placeholder="12,50"
                defaultValue={quotaDefaultDisplay}
                className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2.5 text-base text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#2f3b2f] px-6 py-2.5 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
            >
              Guardar cota
            </button>
          </form>
        </section>

        {/* 2. Malta */}
        <section
          id="malta"
          className={`${sectionClass} mt-8 rounded-2xl border border-[#7f8a6a] bg-[#fcfbf6] p-6 shadow-sm dark:border-[#647157] dark:bg-[#202a20]`}
        >
          <h2 className="text-lg font-semibold text-[#2f3a2d] dark:text-[#e8e3d3]">
            Malta
          </h2>
          <p className="mt-2 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
            Adiciona cada pessoa, a data em que entrou e, se for preciso, a partir de que
            data deve comecar a pagar cota (por defeito: o mes da entrada). As cargas
            mensais alinham-se com a cota definida em 1.
          </p>

          {hasUserFormError ? (
            <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
              Preenche nome e data de entrada.
            </p>
          ) : null}
          {hasChargeStartBeforeEntry ? (
            <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
              A primeira cobranca nao pode ser antes do mes da entrada.
            </p>
          ) : null}
          {hasBillingFormError ? (
            <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
              Verifica utilizador, meses (inicio antes ou igual ao fim) e formatos.
            </p>
          ) : null}

          <form
            action={createUser}
            className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div className="min-w-[200px] flex-1">
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
              >
                Nome
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
              />
            </div>
            <div className="min-w-[180px]">
              <label
                htmlFor="entryDate"
                className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
              >
                Data de entrada
              </label>
              <input
                id="entryDate"
                name="entryDate"
                type="date"
                required
                className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
              />
            </div>
            <div className="min-w-[200px]">
              <label
                htmlFor="chargeStartDate"
                className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
              >
                Primeira cobranca (opcional)
              </label>
              <input
                id="chargeStartDate"
                name="chargeStartDate"
                type="date"
                className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
              />
              <p className="mt-1 text-xs text-[#6f7d5a] dark:text-[#8a9578]">
                Vazio = desde o mes da entrada
              </p>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#2f3b2f] px-5 py-2.5 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
            >
              Adicionar pessoa
            </button>
          </form>

          {users.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-[#9ba78a] bg-[#f5f1e4] p-4 text-sm text-[#4a5644] dark:border-[#738063] dark:bg-[#273126] dark:text-[#cdd6bd]">
              Ainda ninguem na lista.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-xl border border-[#c4d1b3] dark:border-[#4f5a45]">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-[#e8eadf] text-[#3d4a38] dark:bg-[#2a3528] dark:text-[#d5dfc4]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Entrada</th>
                    <th className="px-4 py-3 font-semibold">Cota desde</th>
                    <th className="px-4 py-3 font-semibold">Saldo</th>
                    <th className="px-4 py-3 font-semibold">Meses (estim.)</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Registado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d8e0cc] dark:divide-[#3d4a38]">
                  {users.map((u) => {
                    const d = balanceByUser.get(u.id);
                    const b = d?.balanceCents ?? 0;
                    const warn = d?.quotaNotConfigured
                      ? "Define a cota em 1 para estimar meses."
                      : null;
                    return (
                      <tr
                        key={u.id}
                        className="bg-white/80 text-[#2f3a2d] dark:bg-[#1b241b]/80 dark:text-[#e8e3d3]"
                      >
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 tabular-nums text-[#4a5644] dark:text-[#c5cfb2]">
                          {dateFmt.format(u.entryDate)}
                        </td>
                        <td className="px-4 py-3 text-[#4a5644] dark:text-[#c5cfb2]">
                          {formatMonthKeyLongPt(
                            firstChargeMonthKey({
                              entryDate: u.entryDate,
                              chargeStartDate: u.chargeStartDate,
                            }),
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-medium">
                          {b > 0 ? (
                            eurFmt.format(b / 100)
                          ) : b < 0 ? (
                            <span className="text-[#1d5c38] dark:text-[#8fd4a8]">
                              Crédito {eurFmt.format((-b) / 100)}
                            </span>
                          ) : (
                            eurFmt.format(0)
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#4a5644] dark:text-[#c5cfb2]">
                          <span className="tabular-nums">
                            {d && !d.quotaNotConfigured
                              ? d.estimatedMonthsEquivalent
                              : "—"}
                          </span>
                          {warn ? (
                            <span className="mt-1 block text-xs text-amber-800 dark:text-amber-200">
                              {warn}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {u.active ? (
                            <span className="rounded-full bg-[#d4e6c8] px-2 py-0.5 text-xs font-semibold text-[#2d4a22] dark:bg-[#3d5a35] dark:text-[#c8e8bc]">
                              Ativo
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#e8e0d4] px-2 py-0.5 text-xs font-semibold text-[#5a5345] dark:bg-[#4a4538] dark:text-[#d4cbb8]">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-[#4a5644] dark:text-[#c5cfb2]">
                          {dateTimeFmt.format(u.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div
            id="ausencias"
            className={`${sectionClass} mt-10 rounded-xl border border-dashed border-[#9ba78a] bg-[#f8f6ee]/80 p-5 dark:border-[#738063] dark:bg-[#273126]/50`}
          >
            <h3 className="text-base font-semibold text-[#2f3a2d] dark:text-[#e8e3d3]">
              Ausencias — isentar meses
            </h3>
            <p className="mt-2 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
              Se alguem estiver ausente durante um periodo, indica o intervalo de meses
              (inclusive). Esses meses deixam de ter carga de cota; o saldo actualiza-se
              na hora.
            </p>

            {users.length === 0 ? (
              <p className="mt-3 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
                Adiciona primeiro pessoas acima.
              </p>
            ) : (
              <form
                action={waiveMonthRange}
                className="mt-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end"
              >
                <div className="min-w-[200px] flex-1">
                  <label
                    htmlFor="waiveUserId"
                    className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                  >
                    Quem
                  </label>
                  <select
                    id="waiveUserId"
                    name="waiveUserId"
                    required
                    className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                  >
                    <option value="">Escolher…</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[150px]">
                  <label
                    htmlFor="waiveFromMonth"
                    className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                  >
                    Mes inicial
                  </label>
                  <input
                    id="waiveFromMonth"
                    name="waiveFromMonth"
                    type="month"
                    required
                    className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                  />
                </div>
                <div className="min-w-[150px]">
                  <label
                    htmlFor="waiveToMonth"
                    className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                  >
                    Mes final
                  </label>
                  <input
                    id="waiveToMonth"
                    name="waiveToMonth"
                    type="month"
                    required
                    className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                  />
                </div>
                <div className="min-w-[200px] flex-1">
                  <label
                    htmlFor="waiveNote"
                    className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                  >
                    Nota (opcional)
                  </label>
                  <input
                    id="waiveNote"
                    name="waiveNote"
                    type="text"
                    placeholder="Ex.: ferias, missao"
                    className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-[#4a5a42] px-5 py-2.5 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#5a6b52] dark:bg-[#5a6b52] dark:hover:bg-[#6a7c62]"
                >
                  Isentar meses
                </button>
              </form>
            )}

            <h4 className="mt-8 text-sm font-semibold text-[#2f3a2d] dark:text-[#e8e3d3]">
              Membro ja na lista: mudar inicio da cobranca
            </h4>
            <p className="mt-1 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
              Ajusta a data a partir da qual as cotas mensais devem contar (nao pode ser
              antes do mes da entrada). O saldo e as cargas sao recalculados.
            </p>
            {users.length === 0 ? null : (
              <form
                action={updateUserChargeStart}
                className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="min-w-[200px] flex-1">
                  <label
                    htmlFor="chargeStartUserId"
                    className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                  >
                    Pessoa
                  </label>
                  <select
                    id="chargeStartUserId"
                    name="chargeStartUserId"
                    required
                    className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                  >
                    <option value="">Escolher…</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[200px]">
                  <label
                    htmlFor="chargeStartDateEdit"
                    className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                  >
                    Primeira cobranca
                  </label>
                  <input
                    id="chargeStartDateEdit"
                    name="chargeStartDateEdit"
                    type="date"
                    required
                    className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg border border-[#8b9678] bg-[#ece8da] px-5 py-2.5 text-sm font-semibold text-[#2f3a2d] transition hover:bg-[#e0dccf] dark:border-[#6b775d] dark:bg-[#3a4538] dark:text-[#e8e3d3] dark:hover:bg-[#4a5548]"
                >
                  Actualizar inicio
                </button>
              </form>
            )}
          </div>
        </section>

        {/* 3. Pagamentos */}
        <section
          id="pagamentos"
          className={`${sectionClass} mt-8 rounded-2xl border border-[#7f8a6a] bg-[#fcfbf6] p-6 shadow-sm dark:border-[#647157] dark:bg-[#202a20]`}
        >
          <h2 className="text-lg font-semibold text-[#2f3a2d] dark:text-[#e8e3d3]">
            Pagamentos
          </h2>
          <p className="mt-2 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
            Regista o valor em euros (parcial ou total). O saldo diminui em conformidade.
            O mes e opcional — serve apenas de referencia no historico.
          </p>

          {payErrorMessage ? (
            <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
              {payErrorMessage}
            </p>
          ) : null}

          {users.length === 0 ? (
            <p className="mt-4 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
              Adiciona primeiro pessoas em Malta.
            </p>
          ) : (
            <form
              action={recordPayment}
              className="mt-5 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end"
            >
              <div className="min-w-[200px] flex-1">
                <label
                  htmlFor="payUserId"
                  className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                >
                  Quem pagou
                </label>
                <select
                  id="payUserId"
                  name="payUserId"
                  required
                  className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                >
                  <option value="">Escolher…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px]">
                <label
                  htmlFor="payAmountEur"
                  className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                >
                  Valor (EUR)
                </label>
                <input
                  id="payAmountEur"
                  name="payAmountEur"
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="12,50"
                  className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                />
              </div>
              <div className="min-w-[160px]">
                <label
                  htmlFor="payMonthKey"
                  className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                >
                  Mes (opcional)
                </label>
                <input
                  id="payMonthKey"
                  name="payMonthKey"
                  type="month"
                  className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                />
              </div>
              <div className="min-w-[220px] flex-1">
                <label
                  htmlFor="payNote"
                  className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                >
                  Nota (opcional)
                </label>
                <input
                  id="payNote"
                  name="payNote"
                  type="text"
                  placeholder="Ex.: MB Way"
                  className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[#2f3b2f] px-5 py-2.5 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
              >
                Registar
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
