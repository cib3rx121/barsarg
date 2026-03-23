import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2efe2] px-4 dark:bg-[#1a2119]">
      <main className="w-full max-w-2xl rounded-2xl border border-[#7f8a6a] bg-[#fcfbf6] p-8 shadow-sm dark:border-[#647157] dark:bg-[#202a20]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f7d5a] dark:text-[#b7c29d]">
          Academia Militar
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#2f3a2d] dark:text-[#e8e3d3]">
          Bar de Sargentos
        </h1>
        <p className="mt-3 text-sm text-[#4a5644] dark:text-[#c5cfb2]">
          Gestão centralizada de quotas e saldos dos associados.
        </p>

        <div className="mt-6 rounded-lg border border-dashed border-[#9ba78a] bg-[#f5f1e4] p-3 text-sm text-[#4a5644] dark:border-[#738063] dark:bg-[#273126] dark:text-[#cdd6bd]">
          Estado do serviço: operacional e disponível.
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/login"
            className="rounded-lg bg-[#2f3b2f] px-4 py-3 text-center text-sm font-semibold text-[#f6f3e7] transition hover:bg-[#3b4a39] dark:bg-[#b7c29d] dark:text-[#1e251d] dark:hover:bg-[#cad3b3]"
          >
            Área administrativa
          </Link>
          <Link
            href="/consulta"
            className="rounded-lg border border-[#7f8a6a] px-4 py-3 text-center text-sm font-semibold text-[#2f3a2d] transition hover:bg-[#ece8da] dark:border-[#95a386] dark:text-[#e8e3d3] dark:hover:bg-[#2a3528]"
          >
            Consulta pública
          </Link>
        </div>
      </main>
    </div>
  );
}
