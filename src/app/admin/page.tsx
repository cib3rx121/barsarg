import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearPublicNotice,
  saveGlobalQuota,
  updateAdminPassword,
  updateAdminUsername,
  updateConsultaPin,
  updatePublicNotice,
} from "./actions";
import { AdminAssociatesWorkspace } from "./AdminAssociatesWorkspace";
import {
  backfillMissingMonthlyCharges,
  computeBalancesForUsers,
  firstChargeMonthKey,
} from "@/lib/balance";
import {
  formatMonthKeyLongPt,
  monthKeyFromUtcDate,
} from "@/lib/month-keys";
import { BrandLogo, hasBrandLogo } from "@/components/BrandLogo";
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

const dateTimeFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const inpt =
  "min-h-12 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition duration-200 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-100 sm:text-sm";

const btnPrimary =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 active:scale-[0.99]";

const btnSecondary =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

const card =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-sm sm:rounded-3xl sm:p-6 dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-black/40";

const linkSubtle =
  "text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 transition hover:text-emerald-700 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-emerald-400";

const sectionClass = "scroll-mt-24";
const detailsSummary =
  "flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:hover:bg-slate-800";
const mobileNavBtn =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdminSession();
  await backfillMissingMonthlyCharges();

  const params = await searchParams;
  const hasUserFormError = params.error === "1";
  const hasQuotaFormError = params.error === "2";
  const billingErr = params.error;
  const hasChargeStartBeforeEntry = billingErr === "8";
  const hasBillingFormError = billingErr === "7";
  const hasDeleteError = billingErr === "9";
  const payErr = params.error;
  const payErrorMessage =
    payErr === "4"
      ? "Indique um valor válido (EUR) e, se usar mês, o formato AAAA-MM."
      : null;
  const hasDebtFormError = billingErr === "10";
  const hasAdminCredsError = billingErr === "11";
  const hasConsultaPinError = billingErr === "12";
  const hasPublicNoticeError = billingErr === "13";
  const hasAdminUsernameError = billingErr === "14";
  const hasAdminPasswordError = billingErr === "15";

  const [users, quotaRow] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.quotaSettings.findUnique({
      where: { id: QUOTA_SETTINGS_ID },
    }),
  ]);

  const balanceByUser = await computeBalancesForUsers(users);
  const auditRows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const publicOrigin = await getPublicOrigin();
  const consultaUrl = `${publicOrigin}/consulta`;
  const consultaQrDataUrl = await getConsultaQrDataUrl(consultaUrl);

  const quotaDefaultDisplay = quotaRow
    ? (quotaRow.amountCents / 100).toFixed(2).replace(".", ",")
    : "";

  const serializedMembers = users.map((u) => {
    const d = balanceByUser.get(u.id);
    const entryMk = monthKeyFromUtcDate(u.entryDate);
    const createdMk = monthKeyFromUtcDate(u.createdAt);
    return {
      id: u.id,
      name: u.name,
      entryMonth: entryMk,
      chargeStartMonth: u.chargeStartDate
        ? monthKeyFromUtcDate(u.chargeStartDate)
        : null,
      active: u.active,
      balanceCents: d?.balanceCents ?? 0,
      estimatedMonths: d?.estimatedMonthsEquivalent ?? 0,
      quotaNotConfigured: d?.quotaNotConfigured ?? false,
      chargeMonthLabel: formatMonthKeyLongPt(
        firstChargeMonthKey({
          entryDate: u.entryDate,
          chargeStartDate: u.chargeStartDate,
        }),
      ),
      entryLabel: formatMonthKeyLongPt(entryMk),
      createdMonthLabel: formatMonthKeyLongPt(createdMk),
    };
  });
  const totalMembers = users.length;
  const debtMembers = serializedMembers.filter((m) => m.balanceCents > 0).length;
  const creditMembers = serializedMembers.filter((m) => m.balanceCents < 0).length;
  const totalDebtCents = serializedMembers
    .filter((m) => m.balanceCents > 0)
    .reduce((acc, m) => acc + m.balanceCents, 0);

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

      <div className="admin-shell relative mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-10">
        <header
          className={`admin-header-glow admin-panel-section relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-xl shadow-slate-300/30 backdrop-blur-md sm:rounded-3xl sm:p-8 dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-black/40`}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {hasBrandLogo() ? (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-600 dark:bg-slate-950/40 sm:h-24 sm:w-24">
                <BrandLogo size={80} priority className="p-1.5 sm:p-2" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">
            Bar de Sargentos
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Administração
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Um único painel: mensalidade, QR para o bar e associados. Clique num nome para
            editar, registar pagamento, isenções ou eliminar.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50/50 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100/80 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-100"
            >
              Início
            </Link>
            <form action={logout}>
              <button type="submit" className={btnSecondary}>
                Terminar sessão
              </button>
            </form>
          </div>
            </div>
          </div>
        </header>

        <nav className="admin-panel-section mt-6" aria-label="Atalhos">
          <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-sm md:flex">
            <a href="#definicoes" className={linkSubtle}>
              Mensalidade e QR
            </a>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <a href="#auditoria" className={linkSubtle}>
              Histórico
            </a>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <a href="#seguranca" className={linkSubtle}>
              Segurança
            </a>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <a href="#associados" className={linkSubtle}>
              Associados
            </a>
          </div>

          <details className="md:hidden">
            <summary className={detailsSummary}>
              Menu rápido
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Mobile
              </span>
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href="#definicoes" className={mobileNavBtn}>
                Mensalidade/QR
              </a>
              <a href="#auditoria" className={mobileNavBtn}>
                Histórico
              </a>
              <a href="#seguranca" className={mobileNavBtn}>
                Segurança
              </a>
              <a href="#associados" className={mobileNavBtn}>
                Associados
              </a>
            </div>
          </details>
        </nav>

        <section className="admin-panel-section mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`${card} p-4`}>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Associados
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
              {totalMembers}
            </p>
          </div>
          <div className={`${card} p-4`}>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Com dívida
            </p>
            <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
              {debtMembers}
            </p>
          </div>
          <div className={`${card} p-4`}>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Com crédito
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {creditMembers}
            </p>
          </div>
          <div className={`${card} p-4`}>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Dívida total
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
              {eurFmt.format(totalDebtCents / 100)}
            </p>
          </div>
        </section>

        <section
          id="definicoes"
          className={`admin-panel-section ${sectionClass} mt-8 grid gap-6 lg:grid-cols-2`}
        >
          <div className={card}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Mensalidade global
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Valor único para cargas e estimativas.
            </p>
            {quotaRow ? (
              <div className="mt-4 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 to-white px-4 py-3 dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-slate-900/50">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
                  Em vigor
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {eurFmt.format(quotaRow.amountCents / 100)}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {dateTimeFmt.format(quotaRow.updatedAt)}
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
                Defina a mensalidade para ativar cargas.
              </p>
            )}
            {hasQuotaFormError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
                Montante inválido (deve ser &gt; 0).
              </p>
            ) : null}
            <form action={saveGlobalQuota} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="amountEur"
                  className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Valor (EUR) / mês
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
                Guardar
              </button>
            </form>
          </div>

          <div className={card}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              QR — consulta pública
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Para afixar no bar. Confirme o endereço em produção.
            </p>
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="w-full max-w-[min(220px,88vw)] shrink-0 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-600 dark:bg-slate-950">
                <Image
                  src={consultaQrDataUrl}
                  width={200}
                  height={200}
                  alt="QR consulta"
                  className="h-auto w-full max-h-[220px] object-contain"
                  sizes="(max-width: 640px) 88vw, 200px"
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="break-all font-mono text-xs text-slate-700 dark:text-slate-300">
                  {consultaUrl}
                </p>
                <div className="flex flex-wrap gap-2">
                  <CopyConsultaUrlButton url={consultaUrl} />
                  <Link href="/admin/export.csv" className={`${btnSecondary} inline-flex text-xs`}>
                    Exportar CSV
                  </Link>
                  <a
                    href={consultaQrDataUrl}
                    download="qr-consulta-bar-de-sargentos.png"
                    className={`${btnSecondary} inline-flex text-xs`}
                  >
                    PNG
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="auditoria" className={`admin-panel-section mt-6 scroll-mt-24 ${card}`}>
          <details>
            <summary className={detailsSummary}>
              Histórico (audit log)
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {auditRows.length} evento(s)
              </span>
            </summary>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Últimas ações administrativas registadas no sistema.
            </p>
            {auditRows.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Ainda não existem ações registadas.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {auditRows.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-sm dark:border-slate-700/80 dark:bg-slate-800/40"
                  >
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {row.action} · {row.entity}
                    </p>
                    {row.note ? (
                      <p className="text-slate-600 dark:text-slate-400">{row.note}</p>
                    ) : null}
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {dateTimeFmt.format(row.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </section>

        <section
          id="seguranca"
          className={`admin-panel-section mt-6 scroll-mt-24 grid gap-6 lg:grid-cols-2`}
        >
          <div className={card}>
            <details>
              <summary className={detailsSummary}>Segurança de acesso</summary>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Área recolhível para não ocupar a página toda. Primeiro altere login/senha
                do admin; abaixo altere o PIN público.
              </p>

              {hasAdminCredsError ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
                  Credenciais inválidas. Confirme a palavra-passe atual e os novos dados.
                </p>
              ) : null}
              {hasAdminUsernameError ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
                  Não foi possível alterar o login. Confirme a palavra-passe atual.
                </p>
              ) : null}
              <form action={updateAdminUsername} className="mt-4 space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-700/80 dark:bg-slate-800/35">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  1) Alterar login do admin
                </p>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Login atual
                  </label>
                  <input
                    type="text"
                    value={quotaRow?.adminUsername ?? process.env.ADMIN_USERNAME ?? ""}
                    readOnly
                    className={`${inpt} cursor-not-allowed bg-slate-100/90 dark:bg-slate-800/80`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Palavra-passe atual (confirmação)
                  </label>
                  <input
                    name="currentPasswordForUsername"
                    type="password"
                    required
                    className={inpt}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Novo login (nome de utilizador)
                  </label>
                  <input
                    name="newUsernameOnly"
                    type="text"
                    required
                    defaultValue={quotaRow?.adminUsername ?? process.env.ADMIN_USERNAME ?? ""}
                    className={inpt}
                  />
                </div>
                <button type="submit" className={btnPrimary}>
                  Guardar login
                </button>
              </form>

              {hasAdminPasswordError ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
                  Não foi possível alterar a palavra-passe. Confirme a palavra-passe atual e
                  a confirmação da nova senha.
                </p>
              ) : null}
              <form action={updateAdminPassword} className="mt-4 space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-700/80 dark:bg-slate-800/35">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  2) Alterar palavra-passe do admin
                </p>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Palavra-passe atual
                  </label>
                  <input
                    name="currentPasswordForPassword"
                    type="password"
                    required
                    className={inpt}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nova palavra-passe
                    </label>
                    <input
                      name="newPasswordOnly"
                      type="password"
                      minLength={6}
                      required
                      className={inpt}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Confirmar nova palavra-passe
                    </label>
                    <input
                      name="confirmPasswordOnly"
                      type="password"
                      minLength={6}
                      required
                      className={inpt}
                    />
                  </div>
                </div>
                <button type="submit" className={btnPrimary}>
                  Guardar palavra-passe
                </button>
              </form>

              {hasConsultaPinError ? (
                <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
                  PIN inválido. Use apenas números (4 a 10 dígitos) e confirme corretamente.
                </p>
              ) : null}
              <form action={updateConsultaPin} className="mt-4 space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-700/80 dark:bg-slate-800/35">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  2) Alterar PIN da consulta pública
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Novo PIN
                    </label>
                    <input
                      name="consultaPin"
                      type="password"
                      inputMode="numeric"
                      required
                      className={inpt}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Confirmar PIN
                    </label>
                    <input
                      name="confirmConsultaPin"
                      type="password"
                      inputMode="numeric"
                      required
                      className={inpt}
                    />
                  </div>
                </div>
                <button type="submit" className={btnSecondary}>
                  Guardar PIN
                </button>
              </form>
            </details>
          </div>

          <div className={card}>
            <details>
              <summary className={detailsSummary}>Aviso público</summary>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Mensagem exibida na página pública da consulta para todos os utilizadores.
              </p>
              {hasPublicNoticeError ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
                  O aviso é demasiado longo (máx. 1000 caracteres).
                </p>
              ) : null}
              <form action={updatePublicNotice} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Texto do aviso
                  </label>
                  <textarea
                    name="publicNotice"
                    defaultValue={quotaRow?.publicNotice ?? ""}
                    rows={7}
                    maxLength={1000}
                    className={`${inpt} min-h-[9rem] resize-y`}
                    placeholder="Ex.: Fecho do bar no feriado de 25 de Abril."
                  />
                </div>
                <button type="submit" className={btnPrimary}>
                  Guardar aviso
                </button>
              </form>
              <form action={clearPublicNotice} className="mt-2">
                <button type="submit" className={btnSecondary}>
                  Remover aviso
                </button>
              </form>
            </details>
          </div>
        </section>

        <section
          id="associados"
          className={`admin-panel-section ${sectionClass} mt-8 ${card}`}
        >
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Associados
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Clique numa linha para abrir o painel com todas as acções.
          </p>

          {hasUserFormError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Verifique o nome e os meses (entrada e cobrança) do novo associado.
            </p>
          ) : null}
          {hasChargeStartBeforeEntry ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              A cobrança não pode começar antes do mês de entrada.
            </p>
          ) : null}
          {hasBillingFormError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Verifique o intervalo de isenção (início ≤ fim).
            </p>
          ) : null}
          {hasDeleteError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Para eliminar, escreva exatamente APAGAR no campo de confirmação.
            </p>
          ) : null}
          {payErrorMessage ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              {payErrorMessage}
            </p>
          ) : null}
          {hasDebtFormError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200">
              Indique um valor em euros positivo para a dívida manual (ex.: 20,00).
            </p>
          ) : null}

          <div className="mt-6">
            <AdminAssociatesWorkspace members={serializedMembers} />
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-3 py-2 backdrop-blur md:hidden dark:border-slate-700/80 dark:bg-slate-900/95">
        <div className="mx-auto grid max-w-5xl grid-cols-4 gap-2">
          <a href="#definicoes" className={mobileNavBtn}>
            QR/Cota
          </a>
          <a href="#auditoria" className={mobileNavBtn}>
            Histórico
          </a>
          <a href="#seguranca" className={mobileNavBtn}>
            Segurança
          </a>
          <a href="#associados" className={mobileNavBtn}>
            Associados
          </a>
        </div>
      </div>
    </div>
  );
}
