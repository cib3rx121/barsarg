import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { computeBalancesForUsers } from "@/lib/balance";
import { prisma } from "@/lib/prisma";

function toCsvCell(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

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
    ["Nome", "Ativo", "Entrada", "SaldoCents", "MesesEstimados"].join(","),
    ...users.map((u) => {
      const b = balances.get(u.id);
      return [
        toCsvCell(u.name),
        u.active ? "sim" : "nao",
        u.entryDate.toISOString().slice(0, 10),
        String(b?.balanceCents ?? 0),
        String(b?.estimatedMonthsEquivalent ?? 0),
      ].join(",");
    }),
  ];

  const csv = `${lines.join("\n")}\n`;
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="associados-saldos.csv"`,
      "cache-control": "no-store",
    },
  });
}

