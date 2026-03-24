import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo, hasBrandLogo } from "@/components/BrandLogo";

/** Fundo e animação alinhados ao painel admin — páginas públicas. */
export function PublicShell({
  children,
  className = "",
  showBrandBar = true,
}: {
  children: ReactNode;
  className?: string;
  /** Se false, omite a barra no topo (ex.: landing com logótipo grande no cartão). */
  showBrandBar?: boolean;
}) {
  return (
    <div
      className={`relative min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-slate-50 via-emerald-50/35 to-slate-100 pb-[max(3rem,env(safe-area-inset-bottom))] dark:from-slate-950 dark:via-emerald-950/25 dark:to-slate-900 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-35 dark:opacity-20"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%, rgba(16,185,129,0.12), transparent 42%), radial-gradient(circle at 90% 90%, rgba(59,130,246,0.1), transparent 45%)",
        }}
      />
      <div className="public-shell-content relative mx-auto w-full max-w-4xl px-3 py-6 sm:px-6 sm:py-10">
        {showBrandBar ? (
          <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/"
              className="touch-target -m-2 inline-flex max-w-full items-center gap-3 rounded-2xl p-2 outline-none ring-emerald-500/0 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              {hasBrandLogo() ? (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-600 dark:bg-slate-900/60">
                  <BrandLogo size={56} priority className="p-1" />
                </span>
              ) : null}
              <span className="min-w-0 text-[0.65rem] font-semibold uppercase leading-tight tracking-[0.2em] text-emerald-800 dark:text-emerald-400">
                Bar de Sargentos
              </span>
            </Link>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
