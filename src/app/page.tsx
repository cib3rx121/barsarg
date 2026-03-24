import Link from "next/link";
import { BrandLogo, hasBrandLogo } from "@/components/BrandLogo";
import { PublicShell } from "@/components/PublicShell";

const card =
  "w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm sm:rounded-3xl sm:p-8 dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-black/40";

const btnPrimary =
  "touch-target flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500";

const btnOutline =
  "touch-target flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";

export default function Home() {
  return (
    <PublicShell showBrandBar={false}>
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center py-8">
        <main className={`${card} text-center`}>
          {hasBrandLogo() ? (
            <div className="mb-8 flex justify-center">
              <span className="flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-md dark:border-slate-600 dark:bg-slate-950/40 sm:h-56 sm:w-56">
                <BrandLogo size={200} priority className="p-3 sm:p-3.5" />
              </span>
            </div>
          ) : null}
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">
            Academia Militar
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Bar de Sargentos
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Gestão centralizada de quotas e saldos dos associados.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            Serviço operacional.
          </div>

          <div className="mt-8 grid max-w-md gap-3 sm:mx-auto sm:grid-cols-2">
            <Link href="/admin/login" className={btnPrimary}>
              Área administrativa
            </Link>
            <Link href="/consulta" className={btnOutline}>
              Consulta pública
            </Link>
          </div>
        </main>
      </div>
    </PublicShell>
  );
}
