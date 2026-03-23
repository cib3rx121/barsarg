import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  backfillMissingMonthlyCharges,
  computeBalancesForUsers,
} from "@/lib/balance";
import { prisma } from "@/lib/prisma";

type ConsultaPageProps = {
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
            Consulta pública
          </p>
          <h1 className="mt-2 text-xl font-bold text-[#2f3a2d] dark:text-[#e8e3d3]">
            Acesso por PIN
          </h1>
          <p className="mt-2 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
            Introduza o PIN fornecido pela administração. Só utilizadores autorizados
            devem aceder a esta área.
          </p>

          {hasError ? (
            <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
              PIN incorreto. Tente novamente.
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
              Entrar
            </button>
          </form>
        </main>
      </div>
    );
  }

  await backfillMissingMonthlyCharges();

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const balanceByUser = await computeBalancesForUsers(users);

  return (
    <div className="min-h-screen bg-[#f2efe2] px-4 py-10 dark:bg-[#1a2119]">
      <main className="mx-auto w-full max-w-4xl rounded-2xl border border-[#7f8a6a] bg-[#fcfbf6] p-8 shadow-sm dark:border-[#647157] dark:bg-[#202a20]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f7d5a] dark:text-[#b7c29d]">
          Consulta pública
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#2f3a2d] dark:text-[#e8e3d3]">
          Resumo
        </h1>
        <p className="mt-2 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
          Lista de associados ativos e respectivo saldo (dívida ou crédito). Clique no
          nome para ver o detalhe e o histórico de lançamentos.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex rounded-lg border border-[#7f8a6a] px-4 py-2 text-sm font-semibold text-[#2f3a2d] transition hover:bg-[#ece8da] dark:border-[#95a386] dark:text-[#e8e3d3] dark:hover:bg-[#2a3528]"
          >
            Página inicial
          </Link>
          <form action={logoutConsulta}>
            <button
              type="submit"
              className="inline-flex rounded-lg bg-[#2f3b2f] px-4 py-2 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
            >
              Terminar sessão
            </button>
          </form>
        </div>

        {users.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-[#9ba78a] bg-[#f5f1e4] p-4 text-sm text-[#4a5644] dark:border-[#738063] dark:bg-[#273126] dark:text-[#cdd6bd]">
            Ainda não há utilizadores ativos na lista.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-xl border border-[#c4d1b3] dark:border-[#4f5a45]">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-[#e8eadf] text-[#3d4a38] dark:bg-[#2a3528] dark:text-[#d5dfc4]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Entrada</th>
                  <th className="px-4 py-3 font-semibold">Saldo</th>
                  <th className="px-4 py-3 font-semibold">Meses (estim.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d8e0cc] dark:divide-[#3d4a38]">
                {users.map((u) => {
                  const d = balanceByUser.get(u.id);
                  const b = d?.balanceCents ?? 0;
                  const noQuotaCfg = d?.quotaNotConfigured
                    ? "Cota ainda não definida — meses estimados indisponíveis."
                    : null;
                  return (
                    <tr
                      key={u.id}
                      className="bg-white/80 text-[#2f3a2d] dark:bg-[#1b241b]/80 dark:text-[#e8e3d3]"
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/consulta/${u.id}`}
                          className="text-[#2d4a22] underline decoration-[#7f8a6a] underline-offset-2 hover:text-[#1e251d] dark:text-[#c8e8bc] dark:hover:text-[#e8e3d3]"
                        >
                          {u.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#4a5644] dark:text-[#c5cfb2]">
                        {dateFmt.format(u.entryDate)}
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
                        {noQuotaCfg ? (
                          <span className="mt-1 block text-xs text-amber-800 dark:text-amber-200">
                            {noQuotaCfg}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
