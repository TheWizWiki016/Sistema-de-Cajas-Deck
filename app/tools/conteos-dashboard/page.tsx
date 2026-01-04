"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Conteo = {
  _id: string;
  username: string;
  family: string;
  totals: {
    teorico: number;
    real: number;
    diferencia: number;
    items: number;
  };
  createdAt: string;
};

export default function ConteosDashboardPage() {
  const [conteos, setConteos] = useState<Conteo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConteos = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/conteos?all=1");
      const data = (await response.json()) as {
        conteos?: Conteo[];
        message?: string;
      };
      if (response.ok) {
        setConteos(data.conteos ?? []);
      } else {
        toast.error(data.message ?? "No se pudieron cargar los conteos.");
      }
    } catch (error) {
      toast.error("Error de red al cargar los conteos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConteos();
  }, []);

  const totalConteos = useMemo(() => conteos.length, [conteos]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-zinc-100">
      <div className="pointer-events-none absolute -left-24 top-12 h-80 w-80 rounded-full bg-[#7c1127] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#0f3d36] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.07),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Inventario
            </p>
            <h1 className="text-3xl font-semibold">Conteos guardados</h1>
            <p className="text-sm text-zinc-400">
              {totalConteos} conteos registrados.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#0f3d36]"
              type="button"
              onClick={loadConteos}
            >
              Actualizar
            </button>
            <a
              className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#7c1127]"
              href="/dashboard"
            >
              Volver al dashboard
            </a>
          </div>
        </header>

        <section className="mt-10 rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.6)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Resumen de conteos</h2>
              <p className="text-sm text-zinc-400">
                Reportes por familia y usuario.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              <p className="text-sm text-zinc-400">Cargando conteos...</p>
            ) : null}
            {!loading && conteos.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Aun no hay conteos registrados.
              </p>
            ) : null}

            {conteos.map((conteo) => (
              <div
                key={conteo._id}
                className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {conteo.family} - {conteo.username || "Usuario"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(conteo.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full bg-[var(--panel)] px-3 py-1 text-xs ${
                      conteo.totals.diferencia < 0
                        ? "text-red-400"
                        : conteo.totals.diferencia > 0
                        ? "text-emerald-400"
                        : "text-zinc-200"
                    }`}
                  >
                    Diferencia {conteo.totals.diferencia}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-zinc-300 sm:grid-cols-4">
                  <div>Teorico: {conteo.totals.teorico}</div>
                  <div>Real: {conteo.totals.real}</div>
                  <div>Articulos: {conteo.totals.items}</div>
                  <div>Familia: {conteo.family}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}


