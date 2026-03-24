"use client";

import { useEffect, useMemo, useState } from "react";

const MONTH_OPTIONS = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

type MonthYearFieldProps = {
  name: string;
  idPrefix: string;
  className: string;
  defaultValue?: string;
  required?: boolean;
  allowEmpty?: boolean;
  yearStart?: number;
  yearEnd?: number;
};

function parseMonthKey(value?: string): { year: string; month: string } {
  if (!value) {
    return { year: "", month: "" };
  }
  const m = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!m) {
    return { year: "", month: "" };
  }
  return { year: m[1], month: m[2] };
}

function currentMonthParts() {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return { year, month };
}

export function MonthYearField({
  name,
  idPrefix,
  className,
  defaultValue,
  required = false,
  allowEmpty = false,
  yearStart,
  yearEnd,
}: MonthYearFieldProps) {
  const current = currentMonthParts();
  const startYear = yearStart ?? Number(current.year) - 5;
  const endYear = yearEnd ?? Number(current.year) + 5;

  const years = useMemo(() => {
    const arr: string[] = [];
    for (let y = startYear; y <= endYear; y += 1) {
      arr.push(String(y));
    }
    return arr;
  }, [startYear, endYear]);

  const parsedDefault = parseMonthKey(defaultValue);
  const [year, setYear] = useState(parsedDefault.year);
  const [month, setMonth] = useState(parsedDefault.month);

  useEffect(() => {
    const parsed = parseMonthKey(defaultValue);
    setYear(parsed.year);
    setMonth(parsed.month);
  }, [defaultValue]);

  const hiddenValue = year && month ? `${year}-${month}` : "";
  const monthLabel = MONTH_OPTIONS.find((m) => m.value === month)?.label;

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={hiddenValue} required={required} />
      <div className="grid grid-cols-2 gap-2">
        <select
          id={`${idPrefix}-month`}
          className={className}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          required={required && !allowEmpty}
        >
          {allowEmpty ? <option value="">Mês</option> : null}
          {MONTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          id={`${idPrefix}-year`}
          className={className}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          required={required && !allowEmpty}
        >
          {allowEmpty ? <option value="">Ano</option> : null}
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={() => {
            setYear(current.year);
            setMonth(current.month);
          }}
        >
          Mês atual
        </button>
        {allowEmpty ? (
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => {
              setYear("");
              setMonth("");
            }}
          >
            Limpar
          </button>
        ) : null}
        <span className="ml-auto rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {hiddenValue ? `${monthLabel} ${year}` : "Sem mês selecionado"}
        </span>
      </div>
    </div>
  );
}

