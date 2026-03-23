import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createUser, recordPayment, upsertMonthlyQuota } from "./actions";
import { computeDebtsForUsers } from "@/lib/debt";
import { requireAdminSession } from "@/lib/auth-admin";
import { prisma } from "@/lib/prisma";

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

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdminSession();

  const params = await searchParams;
  const hasUserFormError = params.error === "1";
  const hasQuotaFormError = params.error === "2";
  const payErr = params.error;
  const payErrorMessage =
    payErr === "4"
      ? "Escolhe utilizador e mes do pagamento."
      : payErr === "5"
        ? "Nao ha cota definida para esse mes. Define primeiro em Cotas por mes."
        : payErr === "6"
          ? "Esse utilizador ja tem pagamento registado para esse mes."
          : null;

  const [users, quotas] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.monthlyQuota.findMany({
      orderBy: { monthKey: "desc" },
    }),
  ]);

  const debtByUser = await computeDebtsForUsers(users);

  async function logout() {
    "use server";
    const currentCookies = await cookies();
    currentCookies.delete("barsarg_admin_session");
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#f2efe2] px-4 py-10 dark:bg-[#1a2119]">
      <main className="mx-auto w-full max-w-4xl rounded-2xl border border-[#7f8a6a] bg-[#fcfbf6] p-8 shadow-sm dark:border-[#647157] dark:bg-[#202a20]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f7d5a] dark:text-[#b7c29d]">
          Sala de Operacoes
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#2f3a2d] dark:text-[#e8e3d3]">
          Painel do comando
        </h1>
        <p className="mt-2 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
          Malta registada e pronta para cotas e pagamentos.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex rounded-lg border border-[#7f8a6a] px-4 py-2 text-sm font-semibold text-[#2f3a2d] transition hover:bg-[#ece8da] dark:border-[#95a386] dark:text-[#e8e3d3] dark:hover:bg-[#2a3528]"
          >
            Regressar ao quartel-general
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex rounded-lg bg-[#2f3b2f] px-4 py-2 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
            >
              Bater continencia e sair
            </button>
          </form>
        </div>

        <section className="mt-10 border-t border-dashed border-[#b5c4a3] pt-8 dark:border-[#4f5a45]">
          <h2 className="text-lg font-semibold text-[#2f3a2d] dark:text-[#e8e3d3]">
            Cotas por mes
          </h2>
          <p className="mt-1 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
            Valor em EUR por mes civil (chave YYYY-MM). Se o mes ja existir, o valor
            e atualizado.
          </p>

          {hasQuotaFormError ? (
            <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
              Indica um mes valido e um valor maior que zero (ex.: 12,50).
            </p>
          ) : null}

          <form
            action={upsertMonthlyQuota}
            className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div className="min-w-[160px]">
              <label
                htmlFor="monthKey"
                className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
              >
                Mes
              </label>
              <input
                id="monthKey"
                name="monthKey"
                type="month"
                required
                className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
              />
            </div>
            <div className="min-w-[140px]">
              <label
                htmlFor="amountEur"
                className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
              >
                Valor (EUR)
              </label>
              <input
                id="amountEur"
                name="amountEur"
                type="text"
                inputMode="decimal"
                required
                placeholder="12,50"
                className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#2f3b2f] px-5 py-2.5 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
            >
              Guardar cota
            </button>
          </form>

          {quotas.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-[#9ba78a] bg-[#f5f1e4] p-4 text-sm text-[#4a5644] dark:border-[#738063] dark:bg-[#273126] dark:text-[#cdd6bd]">
              Ainda nao ha cotas definidas. Regista o valor do mes acima.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-[#c4d1b3] dark:border-[#4f5a45]">
              <table className="w-full min-w-[360px] text-left text-sm">
                <thead className="bg-[#e8eadf] text-[#3d4a38] dark:bg-[#2a3528] dark:text-[#d5dfc4]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Mes</th>
                    <th className="px-4 py-3 font-semibold">Valor</th>
                    <th className="px-4 py-3 font-semibold">Registado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d8e0cc] dark:divide-[#3d4a38]">
                  {quotas.map((q) => (
                    <tr
                      key={q.id}
                      className="bg-white/80 text-[#2f3a2d] dark:bg-[#1b241b]/80 dark:text-[#e8e3d3]"
                    >
                      <td className="px-4 py-3 font-mono text-sm tabular-nums">
                        {q.monthKey}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {eurFmt.format(q.amountCents / 100)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#4a5644] dark:text-[#c5cfb2]">
                        {dateTimeFmt.format(q.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-10 border-t border-dashed border-[#b5c4a3] pt-8 dark:border-[#4f5a45]">
          <h2 className="text-lg font-semibold text-[#2f3a2d] dark:text-[#e8e3d3]">
            Novo utilizador
          </h2>
          <p className="mt-1 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
            Data de entrada: conta para a divida desde esse mes (inclusive), como
            no plano do MVP.
          </p>

          {hasUserFormError ? (
            <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
              Preenche nome e data de entrada.
            </p>
          ) : null}

          <form action={createUser} className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[200px] flex-1">
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
              >
                Nome
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
              />
            </div>
            <div className="min-w-[180px]">
              <label
                htmlFor="entryDate"
                className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
              >
                Data de entrada
              </label>
              <input
                id="entryDate"
                name="entryDate"
                type="date"
                required
                className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#2f3b2f] px-5 py-2.5 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
            >
              Adicionar
            </button>
          </form>
        </section>

        <section className="mt-10 border-t border-dashed border-[#b5c4a3] pt-8 dark:border-[#4f5a45]">
          <h2 className="text-lg font-semibold text-[#2f3a2d] dark:text-[#e8e3d3]">
            Registar pagamento
          </h2>
          <p className="mt-1 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
            O valor gravado e o da cota desse mes (snapshot). Pagamentos de meses
            futuros contam como pagos antecipadamente.
          </p>

          {payErrorMessage ? (
            <p className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
              {payErrorMessage}
            </p>
          ) : null}

          {users.length === 0 ? (
            <p className="mt-4 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
              Adiciona um utilizador antes de registar pagamentos.
            </p>
          ) : (
            <form
              action={recordPayment}
              className="mt-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end"
            >
              <div className="min-w-[200px] flex-1">
                <label
                  htmlFor="payUserId"
                  className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                >
                  Utilizador
                </label>
                <select
                  id="payUserId"
                  name="payUserId"
                  required
                  className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                >
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[160px]">
                <label
                  htmlFor="payMonthKey"
                  className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                >
                  Mes pago
                </label>
                <input
                  id="payMonthKey"
                  name="payMonthKey"
                  type="month"
                  required
                  className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                />
              </div>
              <div className="min-w-[220px] flex-1">
                <label
                  htmlFor="payNote"
                  className="mb-1 block text-sm font-medium text-[#3f4a3a] dark:text-[#c5cfb2]"
                >
                  Nota (opcional)
                </label>
                <input
                  id="payNote"
                  name="payNote"
                  type="text"
                  placeholder="Ex.: MB Way, numerario…"
                  className="w-full rounded-lg border border-[#8b9678] bg-white px-3 py-2 text-sm text-[#232b21] outline-none ring-[#5b6a4a] transition focus:ring-2 dark:border-[#6b775d] dark:bg-[#1b241b] dark:text-[#e8e3d3]"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[#2f3b2f] px-5 py-2.5 text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
              >
                Registar pagamento
              </button>
            </form>
          )}
        </section>

        <section className="mt-10 border-t border-dashed border-[#b5c4a3] pt-8 dark:border-[#4f5a45]">
          <h2 className="text-lg font-semibold text-[#2f3a2d] dark:text-[#e8e3d3]">
            Utilizadores
          </h2>

          {users.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-[#9ba78a] bg-[#f5f1e4] p-4 text-sm text-[#4a5644] dark:border-[#738063] dark:bg-[#273126] dark:text-[#cdd6bd]">
              Ainda nao ha ninguem na lista. Adiciona o primeiro acima.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-[#c4d1b3] dark:border-[#4f5a45]">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#e8eadf] text-[#3d4a38] dark:bg-[#2a3528] dark:text-[#d5dfc4]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Entrada</th>
                    <th className="px-4 py-3 font-semibold">Divida</th>
                    <th className="px-4 py-3 font-semibold">Meses em falta</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Registado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d8e0cc] dark:divide-[#3d4a38]">
                  {users.map((u) => {
                    const d = debtByUser.get(u.id);
                    const noQuota = d?.monthsWithoutQuota.length
                      ? `${d.monthsWithoutQuota.length} mes(es) sem cota definida`
                      : null;
                    return (
                      <tr
                        key={u.id}
                        className="bg-white/80 text-[#2f3a2d] dark:bg-[#1b241b]/80 dark:text-[#e8e3d3]"
                      >
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 tabular-nums text-[#4a5644] dark:text-[#c5cfb2]">
                          {dateFmt.format(u.entryDate)}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-medium">
                          {d
                            ? eurFmt.format(d.totalOwedCents / 100)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-[#4a5644] dark:text-[#c5cfb2]">
                          <span className="tabular-nums">
                            {d ? d.owedMonthCount : "—"}
                          </span>
                          {noQuota ? (
                            <span className="mt-1 block text-xs text-amber-800 dark:text-amber-200">
                              {noQuota}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {u.active ? (
                            <span className="rounded-full bg-[#d4e6c8] px-2 py-0.5 text-xs font-semibold text-[#2d4a22] dark:bg-[#3d5a35] dark:text-[#c8e8bc]">
                              Ativo
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#e8e0d4] px-2 py-0.5 text-xs font-semibold text-[#5a5345] dark:bg-[#4a4538] dark:text-[#d4cbb8]">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-[#4a5644] dark:text-[#c5cfb2]">
                          {dateTimeFmt.format(u.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
