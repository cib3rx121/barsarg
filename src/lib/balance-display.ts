/** Saldo / lançamento: vermelho = deve, verde = crédito, neutro = zero. */
export function balanceToneClass(cents: number): string {
  if (cents > 0) {
    return "font-semibold tabular-nums text-red-600 dark:text-red-400";
  }
  if (cents < 0) {
    return "font-semibold tabular-nums text-emerald-600 dark:text-emerald-400";
  }
  return "font-semibold tabular-nums text-slate-700 dark:text-slate-200";
}
