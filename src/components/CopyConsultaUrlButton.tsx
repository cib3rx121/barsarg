"use client";

import { useState } from "react";

type Props = {
  url: string;
  className?: string;
};

export function CopyConsultaUrlButton({ url, className }: Props) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={
        className ??
        "touch-target min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      }
    >
      {done ? "Copiado" : "Copiar endereço"}
    </button>
  );
}
