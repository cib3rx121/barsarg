import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { saveGlobalQuota } from "./actions";
import { AdminAssociatesWorkspace } from "./AdminAssociatesWorkspace";
import {
  backfillMissingMonthlyCharges,
  computeBalancesForUsers,
  firstChargeMonthKey,
} from "@/lib/balance";
import { formatMonthKeyLongPt } from "@/lib/month-keys";
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

  const serializedMembers = users.map((u) => {
    const d = balanceByUser.get(u.id);
    return {
      id: u.id,
      name: u.name,
      entryDate: u.entryDate.toISOString().slice(0, 10),
      chargeStartDate: u.chargeStartDate
        ? u.chargeStartDate.toISOString().slice(0, 10)
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
      entryLabel: dateFmt.format(u.entryDate),
      createdAtLabel: dateTimeFmt.format(u.createdAt),
    };
  });

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

        <nav
          className="admin-panel-section mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
          aria-label="Atalhos"
        >
          <a href="#definicoes" className={linkSubtle}>
            Mensalidade e QR
          </a>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <a href="#associados" className={linkSubtle}>
            Associados
          </a>
        </nav>

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
              Verifique nome e datas do novo associado.
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

          <div className="mt-6">
            <AdminAssociatesWorkspace members={serializedMembers} />
          </div>
        </section>
      </div>
    </div>
  );
}
