const MONTH_KEY_RE = /^\d{4}-\d{2}$/;

export function parseMonthKey(raw: string): string | null {
  const s = raw.trim();
  if (!MONTH_KEY_RE.test(s)) return null;
  const [, m] = s.split("-").map(Number);
  if (m < 1 || m > 12) return null;
  return s;
}

/** Primeiro mes em divida: mes civil da data de entrada (UTC). */
export function monthKeyFromUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKeyUtc(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive; ordem YYYY-MM; vazio se start > end. */
export function monthKeysInclusive(start: string, end: string): string[] {
  if (start > end) return [];
  const out: string[] = [];
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
