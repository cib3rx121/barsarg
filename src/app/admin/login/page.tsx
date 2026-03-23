import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
    <div className="flex min-h-screen items-center justify-center bg-[#f2efe2] px-4 dark:bg-[#1a2119]">
      <main className="w-full max-w-md rounded-2xl border border-[#7f8a6a] bg-[#fcfbf6] p-8 shadow-sm dark:border-[#647157] dark:bg-[#202a20]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f7d5a] dark:text-[#b7c29d]">
          Posto de Comando
        </p>
        <h1 className="mt-2 text-xl font-bold text-[#2f3a2d] dark:text-[#e8e3d3]">
          Entrada do graduado
        </h1>
        <p className="mt-2 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
          Mete as credenciais do comando e siga para a missao.
        </p>

        {hasError ? (
          <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
            Credenciais erradas, meu sargento. Volta a tentar.
          </p>
        ) : null}

        <form action={login} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
            >
              Utilizador
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
            >
              Palavra-passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[#2f3b2f] px-4 py-2.5 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
          >
            Entrar em servico
          </button>
        </form>
      </main>
    </div>
  );
}
