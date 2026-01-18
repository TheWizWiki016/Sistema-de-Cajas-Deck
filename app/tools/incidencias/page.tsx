"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()?.split(";").shift() ?? "");
  }
  return "";
}

type Incidencia = {
  id: string;
  titulo: string;
  tipo: "Tabaco" | "Cerveza" | "General";
  prioridad: "Baja" | "Media" | "Alta" | "Critica";
  descripcion: string;
  responsable: string;
  fecha: string;
  estado: "Abierta" | "En proceso" | "Resuelta";
  createdAt: string;
};

const TIPOS: Incidencia["tipo"][] = ["Tabaco", "Cerveza", "General"];
const PRIORIDADES: Incidencia["prioridad"][] = [
  "Baja",
  "Media",
  "Alta",
  "Critica",
];
const ESTADOS: Array<Incidencia["estado"] | "Todas"> = [
  "Todas",
  "Abierta",
  "En proceso",
  "Resuelta",
];

const STATUS_STYLES: Record<Incidencia["estado"], string> = {
  Abierta: "bg-[#7c1127]/20 text-[#f5b3bf] border-[#7c1127]/40",
  "En proceso": "bg-[#b5832e]/20 text-[#f7d39b] border-[#b5832e]/40",
  Resuelta: "bg-[#0f3d36]/25 text-[#a6e1d6] border-[#0f3d36]/50",
};

const PRIORIDAD_STYLES: Record<Incidencia["prioridad"], string> = {
  Baja: "bg-emerald-400",
  Media: "bg-amber-400",
  Alta: "bg-orange-500",
  Critica: "bg-red-500",
};

const nextEstado = (estado: Incidencia["estado"]) => {
  if (estado === "Abierta") return "En proceso";
  if (estado === "En proceso") return "Resuelta";
  return "Abierta";
};

export default function IncidenciasPage() {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<Incidencia["tipo"]>("Tabaco");
  const [prioridad, setPrioridad] =
    useState<Incidencia["prioridad"]>("Media");
  const [descripcion, setDescripcion] = useState("");
  const [responsable, setResponsable] = useState(() =>
    getCookie("deck_user")
  );
  const [fecha, setFecha] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [filtroEstado, setFiltroEstado] =
    useState<(typeof ESTADOS)[number]>("Todas");

  const resumen = useMemo(() => {
    const total = incidencias.length;
    const abiertas = incidencias.filter((item) => item.estado === "Abierta").length;
    const enProceso = incidencias.filter(
      (item) => item.estado === "En proceso"
    ).length;
    const resueltas = incidencias.filter(
      (item) => item.estado === "Resuelta"
    ).length;
    return { total, abiertas, enProceso, resueltas };
  }, [incidencias]);

  const incidenciasFiltradas = useMemo(() => {
    if (filtroEstado === "Todas") return incidencias;
    return incidencias.filter((item) => item.estado === filtroEstado);
  }, [incidencias, filtroEstado]);

  const resetForm = () => {
    setTitulo("");
    setTipo("Tabaco");
    setPrioridad("Media");
    setDescripcion("");
    setResponsable("");
    setFecha(new Date().toISOString().slice(0, 10));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!titulo.trim()) {
      toast.error("El titulo es obligatorio.");
      return;
    }
    if (!tipo.trim()) {
      toast.error("Selecciona el tipo de incidencia.");
      return;
    }

    const nueva: Incidencia = {
      id: crypto.randomUUID(),
      titulo: titulo.trim(),
      tipo,
      prioridad,
      descripcion: descripcion.trim(),
      responsable: responsable.trim(),
      fecha,
      estado: "Abierta",
      createdAt: new Date().toISOString(),
    };

    setIncidencias((prev) => [nueva, ...prev]);
    resetForm();
    toast.success("Incidencia registrada.");
  };

  const avanzarEstado = (id: string) => {
    setIncidencias((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, estado: nextEstado(item.estado) } : item
      )
    );
  };

  const eliminarIncidencia = (id: string) => {
    setIncidencias((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-zinc-100">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#7c1127] opacity-35 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#0f3d36] opacity-35 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Herramientas
            </p>
            <h1 className="text-3xl font-semibold">Incidencias</h1>
            <p className="text-sm text-zinc-400">
              Registra y sigue incidencias operativas del dia.
            </p>
          </div>
          <a
            className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#7c1127]"
            href="/dashboard"
          >
            Volver al dashboard
          </a>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_1fr]">
          <form
            className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(124,17,39,0.55)]"
            onSubmit={handleSubmit}
          >
            <h2 className="text-xl font-semibold">Nueva incidencia</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Describe el problema y asigna prioridad para seguimiento rapido.
            </p>

            <div className="mt-6 space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-300">Titulo</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                  placeholder="Ej. Caja 2 sin cambio"
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-300">Tipo</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                  value={tipo}
                  onChange={(event) =>
                    setTipo(event.target.value as Incidencia["tipo"])
                  }
                >
                  {TIPOS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Prioridad
                  </span>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                    value={prioridad}
                    onChange={(event) =>
                      setPrioridad(event.target.value as Incidencia["prioridad"])
                    }
                  >
                    {PRIORIDADES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">Fecha</span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                    type="date"
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                  />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-300">
                  Responsable
                </span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                  placeholder="Ej. Ana Perez"
                  value={responsable}
                  onChange={(event) => setResponsable(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-300">
                  Descripcion
                </span>
                <textarea
                  className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                  placeholder="Describe la incidencia y los pasos ya realizados."
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                />
              </label>
            </div>

            <button
              className="mt-6 w-full rounded-2xl bg-[#7c1127] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 hover:bg-[#5c0b1c]"
              type="submit"
            >
              Guardar incidencia
            </button>
          </form>

          <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.6)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Seguimiento</h2>
                <p className="text-sm text-zinc-400">
                  {resumen.total} incidencias ? {resumen.abiertas} abiertas ? {resumen.enProceso} en proceso ? {resumen.resueltas} resueltas
                </p>
              </div>
              <select
                className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-sm text-zinc-100"
                value={filtroEstado}
                onChange={(event) =>
                  setFiltroEstado(event.target.value as (typeof ESTADOS)[number])
                }
              >
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 space-y-4">
              {incidenciasFiltradas.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  No hay incidencias registradas.
                </p>
              ) : null}

              {incidenciasFiltradas.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {item.titulo}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {item.tipo} ? {item.prioridad} ? {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${PRIORIDAD_STYLES[item.prioridad]}`}
                        aria-hidden="true"
                      />
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          STATUS_STYLES[item.estado]
                        }`}
                      >
                        {item.estado}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-zinc-300">
                    {item.descripcion}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span>Responsable: {item.responsable || "Sin asignar"}</span>
                    <span>Fecha: {item.fecha}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="rounded-full border border-white/10 bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-[#7c1127]"
                      type="button"
                      onClick={() => avanzarEstado(item.id)}
                    >
                      Cambiar estado
                    </button>
                    <button
                      className="rounded-full border border-white/10 bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-red-400 hover:border-red-400"
                      type="button"
                      onClick={() => eliminarIncidencia(item.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
