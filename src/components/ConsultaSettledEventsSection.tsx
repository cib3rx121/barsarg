import type { SettledEventPublicRow } from "@/lib/settled-events-public";

const eurFmt = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});
const dateFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type Props = {
  events: SettledEventPublicRow[];
  /** Na página de detalhe, destaca o valor lançado para este utilizador. */
  highlightUserId?: string;
};

export function ConsultaSettledEventsSection({ events, highlightUserId }: Props) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
        Convívios com contas fechadas
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Valores oficiais lançados no saldo. A administração pode ocultar este bloco quando deixar de ser
        necessário.
      </p>
      <ul className="mt-3 list-none space-y-4 pl-0">
        {events.map((ev) => {
          const myRow = highlightUserId
            ? ev.participantRows.find((r) => r.userId === highlightUserId)
            : undefined;
          return (
            <li
              key={ev.id}
              className="rounded-xl border border-slate-200/90 bg-white/90 p-3 text-slate-900 dark:border-slate-600/80 dark:bg-slate-900/50 dark:text-slate-100"
            >
              <p className="font-semibold">
                {ev.title}
                {ev.eventDate ? ` (${dateFmt.format(ev.eventDate)})` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Total: {eurFmt.format(ev.totalCents / 100)}
              </p>
              {ev.invoiceUrl ? (
                <p className="mt-1 text-xs">
                  Comprovativo:{" "}
                  <a
                    href={ev.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-emerald-700 underline underline-offset-2 dark:text-emerald-400"
                  >
                    ver fatura / imagem
                  </a>
                </p>
              ) : null}
              {highlightUserId && myRow ? (
                <p className="mt-2 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
                  O teu valor (lançado no saldo): {eurFmt.format(myRow.amountCents / 100)} ·{" "}
                  {myRow.profileLabel}
                </p>
              ) : null}
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-600/80">
                <table className="w-full min-w-[260px] text-left text-xs">
                  <thead className="bg-slate-100/90 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
                    <tr>
                      <th className="px-2 py-1.5 font-semibold">Nome</th>
                      <th className="px-2 py-1.5 font-semibold">Valor</th>
                      <th className="px-2 py-1.5 font-semibold">Perfil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
                    {ev.participantRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-2 py-1.5">
                          {row.name}
                          {highlightUserId && row.userId === highlightUserId ? (
                            <span className="ml-1 text-emerald-700 dark:text-emerald-400">(tu)</span>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {eurFmt.format(row.amountCents / 100)}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">
                          {row.profileLabel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
