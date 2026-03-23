import Link from "next/link";

export default function ConsultaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <main className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Consulta publica
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Proximo passo: proteger esta pagina por PIN e mostrar estado de divida.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Voltar ao inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
