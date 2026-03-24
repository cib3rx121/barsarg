import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { computeBalancesForUsers } from "@/lib/balance";
import { prisma } from "@/lib/prisma";

function toCsvCell(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

const eurFmt = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const dateFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export async function GET() {
  const session = (await cookies()).get("barsarg_admin_session")?.value;
  if (session !== "ok") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, active: true, entryDate: true },
  });
  const balances = await computeBalancesForUsers(users);

  const lines = [
    [
      "Nome",
      "Ativo",
      "Estado",
      "Data de entrada",
      "Saldo (€)",
      "Saldo (cêntimos)",
      "Meses estimados",
    ].join(";"),
    ...users.map((u) => {
      const b = balances.get(u.id);
      const cents = b?.balanceCents ?? 0;
      const state = cents > 0 ? "Em dívida" : cents < 0 ? "Com crédito" : "Sem saldo";
      return [
        toCsvCell(u.name),
        u.active ? "sim" : "nao",
        toCsvCell(state),
        toCsvCell(dateFmt.format(u.entryDate)),
        toCsvCell(eurFmt.format(Math.abs(cents) / 100)),
        String(cents),
        String(b?.estimatedMonthsEquivalent ?? 0),
      ].join(";");
    }),
  ];

  const bom = "\uFEFF";
  const csv = `${bom}${lines.join("\n")}\n`;
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="associados-saldos.csv"`,
      "cache-control": "no-store",
    },
  });
}

