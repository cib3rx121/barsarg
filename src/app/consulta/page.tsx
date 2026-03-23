import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type ConsultaPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <main className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Consulta publica
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Introduz o PIN para ver os dados publicos.
          </p>

          {hasError ? (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              PIN invalido. Tenta novamente.
            </p>
          ) : null}

          <form action={validatePin} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="pin"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                PIN
              </label>
              <input
                id="pin"
                name="pin"
                type="password"
                required
                inputMode="numeric"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 transition focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Entrar
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <main className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Consulta publica
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Acesso por PIN validado. Proximo passo: mostrar estado de divida.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Voltar ao inicio
          </Link>
          <form action={logoutConsulta}>
            <button
              type="submit"
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Sair da consulta
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
