import Link from "next/link";
import { notFound } from "next/navigation";
import {
  backfillMissingMonthlyCharges,
  computeBalanceDetailForUser,
  ledgerKindLabel,
} from "@/lib/balance";
import { requireConsultaSession } from "@/lib/auth-consulta";

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

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function ConsultaUserDetailPage({ params }: PageProps) {
  await requireConsultaSession();
  await backfillMissingMonthlyCharges();

  const { userId } = await params;
  const data = await computeBalanceDetailForUser(userId);
  if (!data) {
    notFound();
  }

  const {
    user,
    balanceCents,
    estimatedMonthsEquivalent,
    quotaNotConfigured,
    ledgerEntries,
  } = data;

  const b = balanceCents;

  return (
    <div className="min-h-screen bg-[#f2efe2] px-4 py-10 dark:bg-[#1a2119]">
      <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#7f8a6a] bg-[#fcfbf6] p-8 shadow-sm dark:border-[#647157] dark:bg-[#202a20]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f7d5a] dark:text-[#b7c29d]">
          Consulta da Tropa
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#2f3a2d] dark:text-[#e8e3d3]">
          Saldo — {user.name}
        </h1>
        <p className="mt-2 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
          O saldo em euros e a referencia oficial. A coluna de meses e uma estimativa
          com base na cota actual. So leitura.
        </p>

        <div className="mt-6 rounded-lg border border-[#c4d1b3] bg-[#f8f6ee] p-4 dark:border-[#4f5a45] dark:bg-[#273126]">
          <p className="text-sm text-[#4a5644] dark:text-[#c5cfb2]">
            {b > 0
              ? "Divida em falta"
              : b < 0
                ? "Crédito a favor"
                : "Saldo"}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[#2f3a2d] dark:text-[#e8e3d3]">
            {b > 0
              ? eurFmt.format(b / 100)
              : b < 0
                ? eurFmt.format((-b) / 100)
                : eurFmt.format(0)}
          </p>
          {!quotaNotConfigured && b > 0 ? (
            <p className="mt-2 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
              Estimativa: ~{estimatedMonthsEquivalent} mes(es) de cota (referencia).
            </p>
          ) : null}
        </div>

        {quotaNotConfigured ? (
          <p className="mt-4 rounded-md bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
            O comando ainda nao definiu o valor da cota mensal. O saldo em euros
            continua correcto; a estimativa de meses so aparece depois de definir a
            cota.
          </p>
        ) : null}

        {ledgerEntries.length === 0 ? (
          <p className="mt-6 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
            Ainda nao ha lancamentos.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-[#c4d1b3] dark:border-[#4f5a45]">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead className="bg-[#e8eadf] text-[#3d4a38] dark:bg-[#2a3528] dark:text-[#d5dfc4]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Mes</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d8e0cc] dark:divide-[#3d4a38]">
                {ledgerEntries.map((row) => (
                  <tr
                    key={row.id}
                    className="bg-white/80 text-[#2f3a2d] dark:bg-[#1b241b]/80 dark:text-[#e8e3d3]"
                  >
                    <td className="px-4 py-3 tabular-nums text-[#4a5644] dark:text-[#c5cfb2]">
                      {dateTimeFmt.format(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">{ledgerKindLabel(row.kind)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {row.monthKey ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.deltaCents > 0 ? "+" : ""}
                      {eurFmt.format(row.deltaCents / 100)}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-[#4a5644] dark:text-[#c5cfb2]">
                      {row.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/consulta"
            className="inline-flex rounded-lg border border-[#7f8a6a] px-4 py-2 text-sm font-semibold text-[#2f3a2d] transition hover:bg-[#ece8da] dark:border-[#95a386] dark:text-[#e8e3d3] dark:hover:bg-[#2a3528]"
          >
            Voltar a lista
          </Link>
        </div>
      </main>
    </div>
  );
}
