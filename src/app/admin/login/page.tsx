import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BrandLogo, hasBrandLogo } from "@/components/BrandLogo";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params.error === "1";

  async function login(formData: FormData) {
    "use server";

    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    const envUser = process.env.ADMIN_USERNAME ?? "";
    const envPassword = process.env.ADMIN_PASSWORD ?? "";

    if (username !== envUser || password !== envPassword) {
      redirect("/admin/login?error=1");
    }

    const cookieStore = await cookies();
    cookieStore.set("barsarg_admin_session", "ok", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    redirect("/admin");
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-x-hidden overflow-y-auto bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 px-3 py-8 dark:from-slate-950 dark:via-emerald-950/30 dark:to-slate-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.15), transparent 45%), radial-gradient(circle at 80% 80%, rgba(59,130,246,0.12), transparent 40%)",
        }}
      />
      <main className="admin-shell relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-2xl shadow-slate-300/40 backdrop-blur-xl sm:rounded-3xl sm:p-8 dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-black/50">
        {hasBrandLogo() ? (
          <div className="mb-8 flex justify-center">
            <span className="flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-md dark:border-slate-600 dark:bg-slate-950/40 sm:h-56 sm:w-56">
              <BrandLogo size={200} priority className="p-3 sm:p-3.5" />
            </span>
          </div>
        ) : null}
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">
          Bar de Sargentos
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Área de administração
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Introduza as credenciais configuradas no ambiente de alojamento para aceder ao
          painel de gestão de cotas.
        </p>

        {hasError ? (
          <p
            className="mt-5 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            Não foi possível validar as credenciais. Confirme o utilizador e a
            palavra-passe e tente novamente.
          </p>
        ) : null}

        <form action={login} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Utilizador
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition duration-200 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-100 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Palavra-passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm transition duration-200 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-100 sm:text-sm"
            />
          </div>

          <button
            type="submit"
            className="touch-target min-h-12 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition duration-200 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[0.99] dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            Entrar
          </button>
        </form>
      </main>
    </div>
  );
}
