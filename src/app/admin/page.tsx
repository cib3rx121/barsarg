import Image from "next/image";
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
import { CopyConsultaUrlButton } from "@/components/CopyConsultaUrlButton";
import { requireAdminSession } from "@/lib/auth-admin";
import { getConsultaQrDataUrl } from "@/lib/consulta-qr";
import { getPublicOrigin } from "@/lib/public-url";
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

const inpt =
  "w-full min-h-[2.75rem] cursor-pointer rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition duration-200 placeholder:text-slate-400 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-100 dark:focus:border-emerald-400/50";

const inptSelect = `${inpt} appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-10 dark:bg-slate-950/50`;

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition duration-200 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 active:scale-[0.99] dark:bg-emerald-600 dark:hover:bg-emerald-500";

const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/25 active:scale-[0.99] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/90";

const btnMuted =
  "inline-flex items-center justify-center rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition duration-200 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500/30 active:scale-[0.99] dark:bg-slate-600 dark:hover:bg-slate-500";

const card =
  "rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-black/40";

const navPill =
  "inline-flex items-center justify-center rounded-full border border-slate-200/90 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:border-emerald-300/60 hover:bg-emerald-50/80 hover:text-emerald-900 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-100";

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
      ? "Selecione o associado, indique o valor (EUR) e, se preencher o mês, use o formato AAAA-MM."
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

  const publicOrigin = await getPublicOrigin();
  const consultaUrl = `${publicOrigin}/consulta`;
  const consultaQrDataUrl = await getConsultaQrDataUrl(consultaUrl);

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
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-emerald-50/35 to-slate-100 pb-20 dark:from-slate-950 dark:via-emerald-950/25 dark:to-slate-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-35 dark:opacity-20"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%, rgba(16,185,129,0.12), transparent 42%), radial-gradient(circle at 90% 90%, rgba(59,130,246,0.1), transparent 45%)",
        }}
      />

      <div className="admin-shell relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <header
          className={`admin-header-glow admin-panel-section relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-300/30 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-black/40`}
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">
            Bar de Sargentos
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Painel de administração
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Configure o valor da mensalidade, registe associados e movimentos de caixa. O
            saldo em euros reflete todos os lançamentos; a estimativa em meses depende
            do valor atual da cota.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className={`${navPill} border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/30`}
            >
              Página inicial
            </Link>
            <form action={logout}>
              <button type="submit" className={btnSecondary}>
                Terminar sessão
              </button>
            </form>
          </div>
        </header>

        <nav
          className="admin-panel-section sticky top-4 z-20 mt-8 flex flex-wrap gap-2 rounded-2xl border border-slate-200/70 bg-white/85 p-3 shadow-lg shadow-slate-200/30 backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/85 dark:shadow-black/30"
          aria-label="Secções do painel"
        >
          <a href="#qr-consulta" className={navPill}>
            QR consulta
          </a>
          <a href="#cota" className={navPill}>
            Cota
          </a>
          <a href="#membros" className={navPill}>
            Membros
          </a>
          <a href="#pagamentos" className={navPill}>
            Pagamentos
          </a>
          <a href="#ausencias" className={navPill}>
            Ausências
          </a>
        </nav>

        {/* QR — consulta pública */}
        <section
          id="qr-consulta"
          className={`admin-panel-section ${sectionClass} mt-8 ${card}`}
        >
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Código QR — consulta geral
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Gere um cartaz ou etiqueta com este código: ao ler com a câmara do telemóvel,
            abre a página pública de consulta (introdução do PIN). Confirme em produção
            que o endereço abaixo corresponde ao domínio do site.
          </p>
          <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner dark:border-slate-600 dark:bg-slate-950">
              <Image
                src={consultaQrDataUrl}
                width={280}
                height={280}
                alt="Código QR para a página de consulta pública"
                className="h-[280px] w-[280px]"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Endereço codificado
              </p>
              <p className="break-all font-mono text-sm text-slate-800 dark:text-slate-200">
                {consultaUrl}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <CopyConsultaUrlButton url={consultaUrl} />
                <a
                  href={consultaQrDataUrl}
                  download="qr-consulta-bar-de-sargentos.png"
                  className={`${btnSecondary} inline-flex`}
                >
                  Descarregar PNG
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Cota */}
        <section id="cota" className={`admin-panel-section ${sectionClass} mt-8 ${card}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Mensalidade global
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Valor único aplicável a todos os meses. Serve de referência para cargas
                automáticas e para a estimativa de meses em dívida; o saldo efetivo
                resulta sempre dos lançamentos.
              </p>
            </div>
          </div>

          {quotaRow ? (
            <div className="mt-6 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 to-white px-5 py-4 dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-slate-900/50">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
                Valor em vigor
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
                {eurFmt.format(quotaRow.amountCents / 100)}
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Última atualização: {dateTimeFmt.format(quotaRow.updatedAt)}
              </p>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
              Ainda não foi definido um valor de mensalidade. Indique-o abaixo para
              activar as cargas e as estimativas.
            </p>
          )}

          {hasQuotaFormError ? (
            <p
              className="mt-4 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200"
              role="alert"
            >
              Indique um montante superior a zero (ex.: 12,50).
            </p>
          ) : null}

          <form action={saveGlobalQuota} className="mt-6 space-y-4">
            <div className="max-w-xs">
              <label
                htmlFor="amountEur"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Valor mensal (EUR)
              </label>
              <input
                id="amountEur"
                name="amountEur"
                type="text"
                inputMode="decimal"
                required
                placeholder="12,50"
                defaultValue={quotaDefaultDisplay}
                className={inpt}
              />
            </div>
            <button type="submit" className={btnPrimary}>
              Guardar mensalidade
            </button>
          </form>
        </section>

        {/* Membros */}
        <section
          id="membros"
          className={`admin-panel-section ${sectionClass} mt-8 ${card}`}
        >
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Associados
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Registe o nome e a data de filiação. As datas utilizam o calendário do
            sistema (ícone à direita do campo). Se a cobrança de mensalidades deva iniciar
            noutro mês civil, indique a data correspondente; caso contrário, deixe em
            branco para contar desde o mês de entrada.
          </p>

          {hasUserFormError ? (
            <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Verifique o nome e a data de entrada.
            </p>
          ) : null}
          {hasChargeStartBeforeEntry ? (
            <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              A data de início da cobrança não pode ser anterior ao mês de entrada.
            </p>
          ) : null}
          {hasBillingFormError ? (
            <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Verifique o associado, o intervalo de meses (início ≤ fim) e os formatos.
            </p>
          ) : null}

          <form
            action={createUser}
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
          >
            <div className="sm:col-span-2 lg:col-span-1">
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Nome completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className={inpt}
              />
            </div>
            <div>
              <label
                htmlFor="entryDate"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Data de entrada
              </label>
              <input
                id="entryDate"
                name="entryDate"
                type="date"
                required
                className={inpt}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Calendário nativo do dispositivo
              </p>
            </div>
            <div>
              <label
                htmlFor="chargeStartDate"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Início da cobrança (opcional)
              </label>
              <input
                id="chargeStartDate"
                name="chargeStartDate"
                type="date"
                className={inpt}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Vazio = primeiro mês de entrada
              </p>
            </div>
            <div className="flex items-end">
              <button type="submit" className={`${btnPrimary} w-full sm:w-auto`}>
                Adicionar associado
              </button>
            </div>
          </form>

          {users.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-6 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
              Ainda não existem associados registados.
            </p>
          ) : (
            <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-100/90 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Nome</th>
                    <th className="px-4 py-3.5 font-semibold">Entrada</th>
                    <th className="px-4 py-3.5 font-semibold">Cobrança desde</th>
                    <th className="px-4 py-3.5 font-semibold">Saldo</th>
                    <th className="px-4 py-3.5 font-semibold">Meses (estim.)</th>
                    <th className="px-4 py-3.5 font-semibold">Estado</th>
                    <th className="px-4 py-3.5 font-semibold">Registo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                  {users.map((u) => {
                    const d = balanceByUser.get(u.id);
                    const b = d?.balanceCents ?? 0;
                    const warn = d?.quotaNotConfigured
                      ? "Defina a mensalidade na secção «Cota» para obter a estimativa."
                      : null;
                    return (
                      <tr
                        key={u.id}
                        className="bg-white/90 text-slate-900 transition-colors duration-150 hover:bg-emerald-50/50 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-emerald-950/25"
                      >
                        <td className="px-4 py-3.5 font-medium">{u.name}</td>
                        <td className="px-4 py-3.5 tabular-nums text-slate-600 dark:text-slate-400">
                          {dateFmt.format(u.entryDate)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                          {formatMonthKeyLongPt(
                            firstChargeMonthKey({
                              entryDate: u.entryDate,
                              chargeStartDate: u.chargeStartDate,
                            }),
                          )}
                        </td>
                        <td className="px-4 py-3.5 tabular-nums font-medium">
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
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                          <span className="tabular-nums">
                            {d && !d.quotaNotConfigured
                              ? d.estimatedMonthsEquivalent
                              : "—"}
                          </span>
                          {warn ? (
                            <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                              {warn}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5">
                          {u.active ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200">
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 tabular-nums text-slate-600 dark:text-slate-400">
                          {dateTimeFmt.format(u.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Ausências */}
          <div
            id="ausencias"
            className={`${sectionClass} mt-10 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-6 dark:border-slate-700/70 dark:bg-slate-800/40`}
          >
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Isenção de mensalidades (ausência)
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Para períodos de ausência devidamente justificados, indique o intervalo de
              meses civil (calendário mensal abaixo). As cargas correspondentes serão
              removidas e o saldo atualizado.
            </p>

            {users.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                Adicione primeiro um associado na secção acima.
              </p>
            ) : (
              <form
                action={waiveMonthRange}
                className="mt-5 grid gap-4 lg:grid-cols-12 lg:items-end"
              >
                <div className="lg:col-span-3">
                  <label
                    htmlFor="waiveUserId"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Associado
                  </label>
                  <select
                    id="waiveUserId"
                    name="waiveUserId"
                    required
                    className={inptSelect}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364758b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                    }}
                  >
                    <option value="">Selecionar…</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label
                    htmlFor="waiveFromMonth"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Mês inicial
                  </label>
                  <input
                    id="waiveFromMonth"
                    name="waiveFromMonth"
                    type="month"
                    required
                    className={inpt}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label
                    htmlFor="waiveToMonth"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Mês final
                  </label>
                  <input
                    id="waiveToMonth"
                    name="waiveToMonth"
                    type="month"
                    required
                    className={inpt}
                  />
                </div>
                <div className="lg:col-span-3">
                  <label
                    htmlFor="waiveNote"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Nota (opcional)
                  </label>
                  <input
                    id="waiveNote"
                    name="waiveNote"
                    type="text"
                    placeholder="Ex.: serviço, licença"
                    className={inpt}
                  />
                </div>
                <div className="lg:col-span-2 flex">
                  <button type="submit" className={`${btnMuted} w-full`}>
                    Aplicar isenção
                  </button>
                </div>
              </form>
            )}

            <h4 className="mt-10 text-sm font-semibold text-slate-900 dark:text-white">
              Alterar data de início da cobrança
            </h4>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Use esta opção para associados já registados. A data não pode preceder o
              mês de entrada. O sistema recalcula cargas e saldo.
            </p>
            {users.length === 0 ? null : (
              <form
                action={updateUserChargeStart}
                className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="min-w-[220px] flex-1">
                  <label
                    htmlFor="chargeStartUserId"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Associado
                  </label>
                  <select
                    id="chargeStartUserId"
                    name="chargeStartUserId"
                    required
                    className={inptSelect}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364758b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                    }}
                  >
                    <option value="">Selecionar…</option>
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
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Primeira cobrança
                  </label>
                  <input
                    id="chargeStartDateEdit"
                    name="chargeStartDateEdit"
                    type="date"
                    required
                    className={inpt}
                  />
                </div>
                <button type="submit" className={btnSecondary}>
                  Atualizar
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Pagamentos */}
        <section
          id="pagamentos"
          className={`admin-panel-section ${sectionClass} mt-8 ${card}`}
        >
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Registo de pagamentos
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Indique o valor recebido (total ou parcial). O saldo diminui de acordo. O mês
            é opcional e serve apenas de referência no histórico (selector mensal).
          </p>

          {payErrorMessage ? (
            <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              {payErrorMessage}
            </p>
          ) : null}

          {users.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
              Não é possível registar pagamentos sem associados.
            </p>
          ) : (
            <form
              action={recordPayment}
              className="mt-6 grid gap-4 lg:grid-cols-12 lg:items-end"
            >
              <div className="lg:col-span-4">
                <label
                  htmlFor="payUserId"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Associado
                </label>
                <select
                  id="payUserId"
                  name="payUserId"
                  required
                  className={inptSelect}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364758b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="">Selecionar…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label
                  htmlFor="payAmountEur"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
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
                  className={inpt}
                />
              </div>
              <div className="lg:col-span-2">
                <label
                  htmlFor="payMonthKey"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Mês de referência (opcional)
                </label>
                <input
                  id="payMonthKey"
                  name="payMonthKey"
                  type="month"
                  className={inpt}
                />
              </div>
              <div className="lg:col-span-3">
                <label
                  htmlFor="payNote"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Nota (opcional)
                </label>
                <input
                  id="payNote"
                  name="payNote"
                  type="text"
                  placeholder="Ex.: transferência, MB Way"
                  className={inpt}
                />
              </div>
              <div className="lg:col-span-1 flex">
                <button type="submit" className={`${btnPrimary} w-full`}>
                  Registar
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
