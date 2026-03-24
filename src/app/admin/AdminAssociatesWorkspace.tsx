"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { balanceToneClass } from "@/lib/balance-display";
import { MonthYearField } from "@/components/MonthYearField";
import {
  createUser,
  deleteMember,
  recordDebtAdjustment,
  recordPayment,
  updateMember,
  waiveMonthRange,
} from "./actions";

export type SerializedMember = {
  id: string;
  name: string;
  /** AAAA-MM */
  entryMonth: string;
  chargeStartMonth: string | null;
  active: boolean;
  balanceCents: number;
  estimatedMonths: number;
  quotaNotConfigured: boolean;
  chargeMonthLabel: string;
  /** Texto do mês de entrada (lista) */
  entryLabel: string;
  /** Mês de registo no sistema */
  createdMonthLabel: string;
  recentEntries: Array<{
    id: string;
    createdAtIso: string;
    kind: string;
    kindLabel: string;
    monthKey: string | null;
    deltaCents: number;
    note: string | null;
  }>;
};

const inpt =
  "w-full min-h-12 cursor-pointer rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition duration-200 placeholder:text-slate-400 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-100 sm:text-sm";

const btnPrimary =
  "touch-target inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 active:scale-[0.99]";

const btnSecondary =
  "touch-target inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

const btnMuted =
  "touch-target inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600";

const btnDanger =
  "touch-target inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
const chipBtn =
  "inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition";

const sectionTitle =
  "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

const sectionCard =
  "rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-700/80 dark:bg-slate-800/30";

export function AdminAssociatesWorkspace({
  members,
  initialBalanceFilter = "all",
  currentQuotaCents = null,
}: {
  members: SerializedMember[];
  initialBalanceFilter?: "all" | "debt" | "credit" | "zero";
  currentQuotaCents?: number | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<
    "all" | "debt" | "credit" | "zero"
  >(initialBalanceFilter);
  const [quickPayMonth, setQuickPayMonth] = useState<string>("");
  const selected = members.find((m) => m.id === openId) ?? null;

  const eurFmt = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  });
  const currentYear = new Date().getUTCFullYear();
  const currentMonth = new Date();
  const currentMonthKey = `${currentMonth.getUTCFullYear()}-${String(
    currentMonth.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
  const quotaEur = currentQuotaCents && currentQuotaCents > 0
    ? (currentQuotaCents / 100).toFixed(2).replace(".", ",")
    : null;
  const dateTimeFmt = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function openMember(id: string) {
    setQuickPayMonth("");
    setOpenId(id);
  }

  function closeMember() {
    setOpenId(null);
    setQuickPayMonth("");
  }

  function handleDrawerFormSubmit() {
    // Fecha imediatamente o drawer para evitar body lock (overflow hidden)
    // enquanto a server action navega/revalida a página.
    closeMember();
  }

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const matchesQuery = !q || m.name.toLowerCase().includes(q);
      const matchesFilter =
        balanceFilter === "all" ||
        (balanceFilter === "debt" && m.balanceCents > 0) ||
        (balanceFilter === "credit" && m.balanceCents < 0) ||
        (balanceFilter === "zero" && m.balanceCents === 0);
      return matchesQuery && matchesFilter;
    });
  }, [members, query, balanceFilter]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  useEffect(() => {
    if (openId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [openId]);

  return (
    <>
      <form
        id="novo-associado"
        action={createUser}
        className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-700/80 dark:bg-slate-800/30"
      >
        <div>
          <label
            htmlFor="new-name"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Novo — nome
          </label>
          <input
            id="new-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className={inpt}
            placeholder="Nome completo"
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="new-entry-month"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Mês de entrada
            </label>
            <MonthYearField
              idPrefix="new-entry"
              name="entryDate"
              required
              className={inpt}
              yearStart={currentYear - 8}
              yearEnd={currentYear + 4}
              showSelectionSummary={false}
            />
          </div>
          <div>
            <label
              htmlFor="new-charge-month"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Início da cobrança (opcional)
            </label>
            <MonthYearField
              idPrefix="new-charge"
              name="chargeStartDate"
              allowEmpty
              className={inpt}
              yearStart={currentYear - 8}
              yearEnd={currentYear + 4}
              showSelectionSummary={false}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" className={`${btnPrimary} w-full md:w-auto md:min-w-[10rem]`}>
            Adicionar associado
          </button>
        </div>
      </form>

      <div className="mt-4 grid gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={inpt}
          placeholder="Pesquisar associado..."
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBalanceFilter("all")}
            className={`${chipBtn} ${
              balanceFilter === "all"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setBalanceFilter("debt")}
            className={`${chipBtn} ${
              balanceFilter === "debt"
                ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
                : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
            }`}
          >
            Em dívida
          </button>
          <button
            type="button"
            onClick={() => setBalanceFilter("credit")}
            className={`${chipBtn} ${
              balanceFilter === "credit"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
            }`}
          >
            Com crédito
          </button>
          <button
            type="button"
            onClick={() => setBalanceFilter("zero")}
            className={`${chipBtn} ${
              balanceFilter === "zero"
                ? "border-slate-400 bg-slate-100 text-slate-800 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
                : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
            }`}
          >
            Saldo zero
          </button>
          <span className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
            {filteredMembers.length} resultado(s)
          </span>
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
          Sem resultados para os filtros atuais.
        </p>
      ) : (
        <>
          <ul className="mt-6 space-y-2 md:hidden" aria-label="Lista de associados">
            {filteredMembers.map((m) => {
              const b = m.balanceCents;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => openMember(m.id)}
                    className="touch-target w-full rounded-2xl border border-slate-200/90 bg-white/95 p-4 text-left shadow-sm transition active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {m.name}
                        </span>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Entrada: {m.entryLabel} · Cobrança: {m.chargeMonthLabel}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm ${balanceToneClass(b)}`}>
                          {b !== 0
                            ? eurFmt.format(Math.abs(b) / 100)
                            : eurFmt.format(0)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {!m.quotaNotConfigured
                            ? `~${m.estimatedMonths} m.`
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Toque para gerir →
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200/80 md:block dark:border-slate-700/80">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-100/90 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Associado</th>
                  <th className="px-4 py-3.5 font-semibold">Mês entrada</th>
                  <th className="px-4 py-3.5 font-semibold">Cobrança</th>
                  <th className="px-4 py-3.5 font-semibold">Saldo</th>
                  <th className="px-4 py-3.5 font-semibold">Est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                {filteredMembers.map((m) => {
                  const b = m.balanceCents;
                  return (
                    <tr
                      key={m.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openMember(m.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openMember(m.id);
                        }
                      }}
                      className="cursor-pointer bg-white/90 text-slate-900 transition-colors hover:bg-emerald-50/70 focus:bg-emerald-50/70 focus:outline-none dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-emerald-950/30"
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-medium">{m.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                          Clique para gerir
                        </span>
                        <form
                          action={recordPayment}
                          className="mt-2"
                          onClick={(e) => e.stopPropagation()}
                          onSubmit={(e) => {
                            if (!quotaEur) return;
                            if (!window.confirm("Registar pagamento da cota do mês atual?")) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="payUserId" value={m.id} />
                          <input type="hidden" name="payAmountEur" value={quotaEur ?? ""} />
                          <input type="hidden" name="payMonthKey" value={currentMonthKey} />
                          <input type="hidden" name="payNote" value="Pagamento rápido (mês atual)" />
                          <SubmitButton
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                            pendingLabel="A guardar..."
                            disabled={!quotaEur}
                          >
                            + Cota mês
                          </SubmitButton>
                        </form>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-slate-600 dark:text-slate-400">
                        {m.entryLabel}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                        {m.chargeMonthLabel}
                      </td>
                      <td
                        className={`px-4 py-3.5 tabular-nums ${balanceToneClass(b)}`}
                      >
                        {b !== 0
                          ? eurFmt.format(Math.abs(b) / 100)
                          : eurFmt.format(0)}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-slate-600 dark:text-slate-400">
                        {!m.quotaNotConfigured ? m.estimatedMonths : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {openId && selected ? (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-member-title"
        >
          <button
            type="button"
            aria-label="Fechar painel"
            className="drawer-backdrop-animate absolute inset-0 touch-manipulation bg-slate-900/45 backdrop-blur-[2px]"
            onClick={closeMember}
          />
          <aside className="drawer-panel-animate absolute bottom-0 right-0 top-0 z-50 flex min-h-0 w-full max-w-full flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl sm:max-w-md dark:border-slate-700 dark:bg-slate-900">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white/95 p-4 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
              <div className="min-w-0 pr-2">
                <h2
                  id="drawer-member-title"
                  className="text-lg font-semibold leading-snug text-slate-900 dark:text-white"
                >
                  {selected.name}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {selected.balanceCents > 0 ? (
                    <>
                      Deve{" "}
                      <span
                        className={`tabular-nums ${balanceToneClass(selected.balanceCents)}`}
                      >
                        {eurFmt.format(selected.balanceCents / 100)}
                      </span>
                    </>
                  ) : selected.balanceCents < 0 ? (
                    <>
                      Crédito{" "}
                      <span
                        className={`tabular-nums ${balanceToneClass(selected.balanceCents)}`}
                      >
                        {eurFmt.format((-selected.balanceCents) / 100)}
                      </span>
                    </>
                  ) : (
                    <>
                      Saldo{" "}
                      <span className={balanceToneClass(0)}>
                        {eurFmt.format(0)}
                      </span>
                    </>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Registo (mês): {selected.createdMonthLabel}
                </p>
                <button
                  type="button"
                  className="mt-3 text-left text-xs font-semibold text-red-700 underline decoration-red-300 underline-offset-2 dark:text-red-400 dark:decoration-red-800"
                  onClick={() =>
                    document
                      .getElementById("associado-drawer-delete")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  Eliminar associado — toque para ir ao formulário ↓
                </button>
              </div>
              <button
                type="button"
                onClick={closeMember}
                className="touch-target shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 pb-[max(6rem,env(safe-area-inset-bottom,0px)+3rem)] pt-4 sm:px-5 sm:pb-8 sm:pt-5"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className={sectionCard}>
                <p className={sectionTitle}>Dados do associado</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Edite nome e meses de forma simples. O mês da cobrança não pode ser
                  anterior ao mês de entrada.
                </p>
              <form
                key={`edit-${selected.id}`}
                action={updateMember}
                onSubmit={handleDrawerFormSubmit}
                className="mt-3 space-y-3"
              >
                <input type="hidden" name="userId" value={selected.id} />
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nome
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={selected.name}
                    className={inpt}
                  />
                </div>
                <div className="grid gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Mês de entrada
                    </label>
                    <MonthYearField
                      idPrefix={`edit-entry-${selected.id}`}
                      name="entryDate"
                      required
                      defaultValue={selected.entryMonth}
                      className={inpt}
                      yearStart={currentYear - 8}
                      yearEnd={currentYear + 4}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Início da cobrança (opcional)
                    </label>
                    <MonthYearField
                      idPrefix={`edit-charge-${selected.id}`}
                      name="chargeStartDate"
                      allowEmpty
                      defaultValue={selected.chargeStartMonth ?? ""}
                      className={inpt}
                      yearStart={currentYear - 8}
                      yearEnd={currentYear + 4}
                    />
                  </div>
                </div>
                <button type="submit" className={`${btnPrimary} w-full`}>
                  Guardar alterações
                </button>
              </form>
              </div>

              <div className="my-6 border-t border-slate-200 dark:border-slate-700" />

              <details className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-700/80 dark:bg-slate-800/30">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Registar pagamento
                </summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["10,00", "15,00", "20,00", "25,00"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      onClick={(e) => {
                        const input = e.currentTarget
                          .closest("details")
                          ?.querySelector<HTMLInputElement>(
                          `input[name="payAmountEur"]`,
                        );
                        if (input) input.value = v;
                      }}
                    >
                      {v} €
                    </button>
                  ))}
                </div>
                <form
                  key={`pay-${selected.id}`}
                  action={recordPayment}
                  onSubmit={handleDrawerFormSubmit}
                  className="mt-3 space-y-3"
                >
                  <input type="hidden" name="payUserId" value={selected.id} />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Valor (EUR)
                    </label>
                    <input
                      name="payAmountEur"
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="12,50"
                      className={inpt}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Mês de referência (opcional)
                    </label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={() => setQuickPayMonth(currentMonthKey)}
                      >
                        Mês atual
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={() => {
                          const d = new Date();
                          d.setUTCMonth(d.getUTCMonth() - 1);
                          setQuickPayMonth(
                            `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
                          );
                        }}
                      >
                        Mês anterior
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        onClick={() => {
                          const d = new Date();
                          d.setUTCMonth(d.getUTCMonth() + 1);
                          setQuickPayMonth(
                            `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
                          );
                        }}
                      >
                        Próximo mês
                      </button>
                    </div>
                    <MonthYearField
                      key={`pay-month-field-${selected.id}-${quickPayMonth || "empty"}`}
                      idPrefix={`pay-month-${selected.id}`}
                      name="payMonthKey"
                      allowEmpty
                      defaultValue={quickPayMonth}
                      className={inpt}
                      yearStart={currentYear - 8}
                      yearEnd={currentYear + 4}
                      showSelectionSummary={false}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nota (opcional)
                    </label>
                    <input
                      name="payNote"
                      type="text"
                      placeholder="Ex.: transferência"
                      className={inpt}
                    />
                  </div>
                  <SubmitButton className={`${btnSecondary} w-full`} pendingLabel="A guardar...">
                    Registar pagamento
                  </SubmitButton>
                </form>
              </details>

              <div className="my-6 border-t border-slate-200 dark:border-slate-700" />

              <details className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-700/80 dark:bg-slate-800/30">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Dívida manual
                </summary>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  Adiciona dívida extra no saldo (ex.: 20 €).
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["10,00", "20,00", "30,00", "50,00"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      onClick={(e) => {
                        const input = e.currentTarget
                          .closest("details")
                          ?.querySelector<HTMLInputElement>(
                          `input[name="debtAmountEur"]`,
                        );
                        if (input) input.value = v;
                      }}
                    >
                      {v} €
                    </button>
                  ))}
                </div>
                <form
                  key={`debt-${selected.id}`}
                  action={recordDebtAdjustment}
                  onSubmit={handleDrawerFormSubmit}
                  className="mt-3 space-y-3"
                >
                  <input type="hidden" name="debtUserId" value={selected.id} />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Valor em dívida (EUR)
                    </label>
                    <input
                      name="debtAmountEur"
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="20,00"
                      className={inpt}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nota (opcional)
                    </label>
                    <input
                      name="debtNote"
                      type="text"
                      placeholder="Ex.: dívida anterior ao sistema"
                      className={inpt}
                    />
                  </div>
                  <SubmitButton className={`${btnSecondary} w-full`} pendingLabel="A guardar...">
                    Adicionar à dívida
                  </SubmitButton>
                </form>
              </details>

              <div className="my-6 border-t border-slate-200 dark:border-slate-700" />

              <p className={sectionTitle}>Isenção por ausência</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Intervalo de meses sem cota (inclusive).
              </p>
              <form
                key={`waive-${selected.id}`}
                action={waiveMonthRange}
                onSubmit={handleDrawerFormSubmit}
                className="mt-3 space-y-3"
              >
                <input type="hidden" name="waiveUserId" value={selected.id} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      De
                    </label>
                    <MonthYearField
                      idPrefix={`waive-from-${selected.id}`}
                      name="waiveFromMonth"
                      required
                      className={inpt}
                      yearStart={currentYear - 8}
                      yearEnd={currentYear + 4}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Até
                    </label>
                    <MonthYearField
                      idPrefix={`waive-to-${selected.id}`}
                      name="waiveToMonth"
                      required
                      className={inpt}
                      yearStart={currentYear - 8}
                      yearEnd={currentYear + 4}
                    />
                  </div>
                </div>
                <input
                  name="waiveNote"
                  type="text"
                  placeholder="Nota (opcional)"
                  className={inpt}
                />
                <SubmitButton className={btnMuted} pendingLabel="A guardar...">
                  Aplicar isenção
                </SubmitButton>
              </form>

              <section
                id="associado-drawer-delete"
                className="scroll-mt-6 border-t border-red-200/80 pt-6 dark:border-red-900/40"
              >
                <p className={sectionTitle}>Remover associado</p>
                <p className="mt-1 text-xs text-red-700/90 dark:text-red-300/90">
                  Apaga o registo e todo o histórico de lançamentos. Escreva APAGAR para
                  confirmar.
                </p>
                <form
                  key={`del-${selected.id}`}
                  action={deleteMember}
                  onSubmit={handleDrawerFormSubmit}
                  className="mt-3 space-y-3"
                >
                  <input type="hidden" name="userId" value={selected.id} />
                  <input
                    name="deleteConfirm"
                    type="text"
                    autoComplete="off"
                    placeholder="APAGAR"
                    className={inpt}
                  />
                  <SubmitButton className={btnDanger} pendingLabel="A eliminar...">
                    Eliminar definitivamente
                  </SubmitButton>
                </form>
              </section>

              <div className="my-6 border-t border-slate-200 dark:border-slate-700" />
              <p className={sectionTitle}>Últimos lançamentos</p>
              {selected.recentEntries.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Sem lançamentos recentes.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {selected.recentEntries.map((entry) => (
                    <li key={entry.id} className="rounded-lg border border-slate-200/80 p-2 text-xs dark:border-slate-700/80">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {entry.kindLabel} · {entry.deltaCents >= 0 ? "+" : "-"}
                        {eurFmt.format(Math.abs(entry.deltaCents) / 100)}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {dateTimeFmt.format(new Date(entry.createdAtIso))} · Mês: {entry.monthKey ?? "—"}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">{entry.note ?? "—"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function SubmitButton({
  children,
  className,
  pendingLabel,
  disabled,
}: {
  children: ReactNode;
  className: string;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={disabled || pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
