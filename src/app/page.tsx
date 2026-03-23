import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <main className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          barsarg
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Plataforma de gestao de cotas mensais do bar.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/login"
            className="rounded-lg bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Entrar como admin
          </Link>
          <Link
            href="/consulta"
            className="rounded-lg border border-zinc-300 px-4 py-3 text-center text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Consulta publica
          </Link>
        </div>
      </main>
    </div>
  );
}
