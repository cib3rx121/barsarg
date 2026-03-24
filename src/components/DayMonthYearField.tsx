"use client";

import { useMemo, useState } from "react";

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

type DayMonthYearFieldProps = {
  name: string;
  idPrefix: string;
  className: string;
  defaultValue?: string;
  required?: boolean;
  yearStart?: number;
  yearEnd?: number;
};

function parseDateKey(value?: string): { year: string; month: string; day: string } {
  if (!value) return { year: "", month: "", day: "" };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return { year: "", month: "", day: "" };
  return { year: m[1], month: m[2], day: m[3] };
}

function currentDateParts() {
  const now = new Date();
  return {
    year: String(now.getUTCFullYear()),
    month: String(now.getUTCMonth() + 1).padStart(2, "0"),
    day: String(now.getUTCDate()).padStart(2, "0"),
  };
}

function daysInMonth(year: string, month: string): number {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m) return 31;
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function DayMonthYearField({
  name,
  idPrefix,
  className,
  defaultValue,
  required = false,
  yearStart,
  yearEnd,
}: DayMonthYearFieldProps) {
  const current = currentDateParts();
  const startYear = yearStart ?? Number(current.year) - 5;
  const endYear = yearEnd ?? Number(current.year) + 5;

  const years = useMemo(() => {
    const arr: string[] = [];
    for (let y = startYear; y <= endYear; y += 1) arr.push(String(y));
    return arr;
  }, [startYear, endYear]);

  const parsedDefault = parseDateKey(defaultValue);
  const [year, setYear] = useState(parsedDefault.year || current.year);
  const [month, setMonth] = useState(parsedDefault.month || current.month);
  const [day, setDay] = useState(parsedDefault.day || current.day);

  const maxDays = daysInMonth(year, month);
  const dayOptions = useMemo(
    () => Array.from({ length: maxDays }, (_, i) => String(i + 1).padStart(2, "0")),
    [maxDays],
  );

  const safeDay = Number(day) > maxDays ? String(maxDays).padStart(2, "0") : day;
  const hiddenValue = year && month && safeDay ? `${year}-${month}-${safeDay}` : "";

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={hiddenValue} required={required} />
      <div className="grid grid-cols-3 gap-2">
        <select
          id={`${idPrefix}-day`}
          className={className}
          value={safeDay}
          onChange={(e) => setDay(e.target.value)}
          required={required}
        >
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          id={`${idPrefix}-month`}
          className={className}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          required={required}
        >
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
          required={required}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={() => {
            setYear(current.year);
            setMonth(current.month);
            setDay(current.day);
          }}
        >
          Hoje
        </button>
        <span className="ml-auto rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {safeDay}/{month}/{year}
        </span>
      </div>
    </div>
  );
}

