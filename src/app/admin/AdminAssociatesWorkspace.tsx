"use client";

import { useEffect, useState } from "react";
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

const sectionTitle =
  "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

const sectionCard =
  "rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-700/80 dark:bg-slate-800/30";

export function AdminAssociatesWorkspace({
  members,
}: {
  members: SerializedMember[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = members.find((m) => m.id === openId) ?? null;

  const eurFmt = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  });
  const currentYear = new Date().getUTCFullYear();

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
        action={createUser}
        className="grid gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-700/80 dark:bg-slate-800/30 sm:grid-cols-2 lg:grid-cols-12 lg:items-end"
      >
        <div className="lg:col-span-3">
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
        <div className="lg:col-span-2">
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
          />
        </div>
        <div className="lg:col-span-2">
          <label
            htmlFor="new-charge-month"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Mês de início da cobrança (opc.)
          </label>
          <MonthYearField
            idPrefix="new-charge"
            name="chargeStartDate"
            allowEmpty
            className={inpt}
            yearStart={currentYear - 8}
            yearEnd={currentYear + 4}
          />
        </div>
        <div className="flex lg:col-span-2">
          <button type="submit" className={`${btnPrimary} w-full`}>
            Adicionar
          </button>
        </div>
      </form>

      {members.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
          Ainda não existem associados. Utilize o formulário acima.
        </p>
      ) : (
        <>
          <ul className="mt-6 space-y-2 md:hidden" aria-label="Lista de associados">
            {members.map((m) => {
              const b = m.balanceCents;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(m.id)}
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
                {members.map((m) => {
                  const b = m.balanceCents;
                  return (
                    <tr
                      key={m.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpenId(m.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpenId(m.id);
                        }
                      }}
                      className="cursor-pointer bg-white/90 text-slate-900 transition-colors hover:bg-emerald-50/70 focus:bg-emerald-50/70 focus:outline-none dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-emerald-950/30"
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-medium">{m.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                          Clique para gerir
                        </span>
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
            onClick={() => setOpenId(null)}
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
                onClick={() => setOpenId(null)}
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
                <div className="grid gap-3 sm:grid-cols-2">
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

              <p className={sectionTitle}>Registar pagamento</p>
              <form
                key={`pay-${selected.id}`}
                action={recordPayment}
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
                  <MonthYearField
                    idPrefix={`pay-month-${selected.id}`}
                    name="payMonthKey"
                    allowEmpty
                    className={inpt}
                    yearStart={currentYear - 8}
                    yearEnd={currentYear + 4}
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
                <button type="submit" className={`${btnSecondary} w-full`}>
                  Registar pagamento
                </button>
              </form>

              <div className="my-6 border-t border-slate-200 dark:border-slate-700" />

              <p className={sectionTitle}>Dívida manual</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Indica quanto ainda falta pagar (ex.: 20 €). O valor soma ao saldo em
                dívida e aparece no extrato a vermelho — sem símbolo «+», só o montante.
              </p>
              <form
                key={`debt-${selected.id}`}
                action={recordDebtAdjustment}
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
                <button type="submit" className={`${btnSecondary} w-full`}>
                  Adicionar à dívida
                </button>
              </form>

              <div className="my-6 border-t border-slate-200 dark:border-slate-700" />

              <p className={sectionTitle}>Isenção por ausência</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Intervalo de meses sem cota (inclusive).
              </p>
              <form
                key={`waive-${selected.id}`}
                action={waiveMonthRange}
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
                <button type="submit" className={btnMuted}>
                  Aplicar isenção
                </button>
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
                  <button type="submit" className={btnDanger}>
                    Eliminar definitivamente
                  </button>
                </form>
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
