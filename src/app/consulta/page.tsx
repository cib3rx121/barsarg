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
      <div className="flex min-h-screen items-center justify-center bg-[#f2efe2] px-4 dark:bg-[#1a2119]">
        <main className="w-full max-w-md rounded-2xl border border-[#7f8a6a] bg-[#fcfbf6] p-8 shadow-sm dark:border-[#647157] dark:bg-[#202a20]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f7d5a] dark:text-[#b7c29d]">
            Consulta da Tropa
          </p>
          <h1 className="mt-2 text-xl font-bold text-[#2f3a2d] dark:text-[#e8e3d3]">
            Acesso por PIN
          </h1>
          <p className="mt-2 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
            So entra quem sabe a senha do dia.
          </p>

          {hasError ? (
            <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
              PIN furado. Tenta outra vez.
            </p>
          ) : null}

          <form action={validatePin} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="pin"
                className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
              >
                PIN
              </label>
              <input
                id="pin"
                name="pin"
                type="password"
                required
                inputMode="numeric"
                className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#2f3b2f] px-4 py-2.5 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
            >
              Abrir passagem
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2efe2] px-4 dark:bg-[#1a2119]">
      <main className="w-full max-w-xl rounded-2xl border border-[#7f8a6a] bg-[#fcfbf6] p-8 shadow-sm dark:border-[#647157] dark:bg-[#202a20]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f7d5a] dark:text-[#b7c29d]">
          Consulta da Tropa
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#2f3a2d] dark:text-[#e8e3d3]">
          Situacao geral
        </h1>
        <p className="mt-2 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
          Entrada validada. Sem filmes: em breve mostramos a divida da malta.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex rounded-lg border border-[#7f8a6a] px-4 py-2 text-sm font-semibold text-[#2f3a2d] transition hover:bg-[#ece8da] dark:border-[#95a386] dark:text-[#e8e3d3] dark:hover:bg-[#2a3528]"
          >
            Regressar ao quartel-general
          </Link>
          <form action={logoutConsulta}>
            <button
              type="submit"
              className="inline-flex rounded-lg bg-[#2f3b2f] px-4 py-2 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
            >
              Fechar passagem
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
