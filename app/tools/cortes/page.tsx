"use client";

import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  text: string;
  done: boolean;
};

type Corte = {
  _id: string;
  corteTeorico: number;
  corteReal: number;
  depositado: number;
  pico: number;
  diferencia: number;
  fondoValidado: boolean;
  fondoCantidad?: number;
  pendientes: { text: string; done: boolean }[];
  createdAt: string;
};

export default function CortesPage() {
  const [corteTeorico, setCorteTeorico] = useState("");
  const [corteReal, setCorteReal] = useState("");
  const [depositado, setDepositado] = useState("");
  const [fondoValidado, setFondoValidado] = useState<"si" | "no">("no");
  const [fondoCantidad, setFondoCantidad] = useState("");
  const [pendientes, setPendientes] = useState<Task[]>([]);
  const [nuevoPendiente, setNuevoPendiente] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Corte[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/cortes");
      const data = (await response.json()) as { cortes?: Corte[] };
      if (response.ok) {
        setHistory(data.cortes ?? []);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const diferencia = useMemo(() => {
    const teorico = Number(corteTeorico);
    const real = Number(corteReal);
    if (Number.isNaN(teorico) || Number.isNaN(real)) {
      return null;
    }
    return real - teorico;
  }, [corteTeorico, corteReal]);

  const pico = useMemo(() => {
    const real = Number(corteReal);
    const dep = Number(depositado);
    if (Number.isNaN(real) || Number.isNaN(dep)) {
      return null;
    }
    return real - dep;
  }, [corteReal, depositado]);

  const formatSigned = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}`;
  };

  const valueTone = (value: number) =>
    value < 0 ? "text-red-600" : value > 0 ? "text-emerald-600" : "text-zinc-900";

  const addPendiente = () => {
    const text = nuevoPendiente.trim();
    if (!text) {
      return;
    }
    setPendientes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, done: false },
    ]);
    setNuevoPendiente("");
  };

  const togglePendiente = (id: string) => {
    setPendientes((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  const removePendiente = (id: string) => {
    setPendientes((prev) => prev.filter((task) => task.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!corteTeorico || !corteReal) {
      setMessage("Completa corte teorico y corte real.");
      return;
    }

    if (!depositado) {
      setMessage("Ingresa el monto depositado.");
      return;
    }

    if (fondoValidado === "si" && !fondoCantidad) {
      setMessage("Ingresa la cantidad del fondo validado.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/cortes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corteTeorico: Number(corteTeorico),
          corteReal: Number(corteReal),
          diferencia: diferencia ?? 0,
          depositado: Number(depositado),
          pico: pico ?? 0,
          pendientes: pendientes.map((task) => ({
            text: task.text,
            done: task.done,
          })),
          fondoValidado: fondoValidado === "si",
          fondoCantidad:
            fondoValidado === "si" ? Number(fondoCantidad) : undefined,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(data.message ?? "No se pudo guardar el corte.");
        return;
      }

      setMessage("Corte guardado correctamente.");
      setCorteTeorico("");
      setCorteReal("");
      setDepositado("");
      setFondoValidado("no");
      setFondoCantidad("");
      setPendientes([]);
      setNuevoPendiente("");
      loadHistory();
    } catch (error) {
      setMessage("Error de red. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6efe6] text-zinc-900">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#ffb27a] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#7bb4d9] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Herramientas
            </p>
            <h1 className="text-3xl font-semibold">Corte de caja</h1>
            <p className="text-sm text-zinc-600">
              Registra corte teorico, real y pendientes del turno.
            </p>
          </div>
          <a
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-900"
            href="/dashboard"
          >
            Volver al dashboard
          </a>
        </header>

        <form
          className="mt-10 space-y-8 rounded-3xl border border-black/10 bg-white/85 p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700">
                Corte teorico
              </span>
              <input
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:border-zinc-900"
                type="number"
                step="0.01"
                value={corteTeorico}
                onChange={(event) => setCorteTeorico(event.target.value)}
                placeholder="0.00"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700">
                Corte real
              </span>
              <input
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:border-zinc-900"
                type="number"
                step="0.01"
                value={corteReal}
                onChange={(event) => setCorteReal(event.target.value)}
                placeholder="0.00"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-700">
                Depositado
              </span>
              <input
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:border-zinc-900"
                type="number"
                step="0.01"
                value={depositado}
                onChange={(event) => setDepositado(event.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Diferencia
              </p>
              <p
                className={`mt-2 text-2xl font-semibold ${
                  diferencia === null ? "text-zinc-900" : valueTone(diferencia)
                }`}
              >
                {diferencia === null ? "--" : formatSigned(diferencia)}
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Pico
              </p>
              <p
                className={`mt-2 text-2xl font-semibold ${
                  pico === null ? "text-zinc-900" : valueTone(pico)
                }`}
              >
                {pico === null ? "--" : formatSigned(pico)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Fondo validado
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="fondoValidado"
                  checked={fondoValidado === "si"}
                  onChange={() => setFondoValidado("si")}
                />
                Si
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="fondoValidado"
                  checked={fondoValidado === "no"}
                  onChange={() => setFondoValidado("no")}
                />
                No
              </label>
            </div>
            {fondoValidado === "si" ? (
              <input
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:border-zinc-900"
                type="number"
                step="0.01"
                value={fondoCantidad}
                onChange={(event) => setFondoCantidad(event.target.value)}
                placeholder="Cantidad del fondo"
              />
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Pendientes
              </p>
              <span className="text-xs text-zinc-500">
                {pendientes.filter((task) => task.done).length}/
                {pendientes.length} completados
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-900"
                placeholder="Agregar pendiente"
                value={nuevoPendiente}
                onChange={(event) => setNuevoPendiente(event.target.value)}
              />
              <button
                className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white"
                type="button"
                onClick={addPendiente}
              >
                Agregar
              </button>
            </div>

            <div className="space-y-2">
              {pendientes.length === 0 ? (
                <p className="text-sm text-zinc-600">
                  No hay pendientes registrados.
                </p>
              ) : null}
              {pendientes.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-4 py-3"
                >
                  <label className="flex items-center gap-3 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => togglePendiente(task.id)}
                    />
                    <span className={task.done ? "line-through" : ""}>
                      {task.text}
                    </span>
                  </label>
                  <button
                    className="text-xs font-semibold text-red-600"
                    type="button"
                    onClick={() => removePendiente(task.id)}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {message ? (
            <div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-700">
              {message}
            </div>
          ) : null}

          <button
            className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar corte"}
          </button>
        </form>

        <section className="mt-10 rounded-3xl border border-black/10 bg-white/85 p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Historico de cortes</h2>
              <p className="text-sm text-zinc-600">
                Ultimos registros guardados en la base de datos.
              </p>
            </div>
            <button
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-zinc-900"
              type="button"
              onClick={loadHistory}
            >
              Actualizar
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {loadingHistory ? (
              <p className="text-sm text-zinc-600">Cargando historico...</p>
            ) : null}
            {!loadingHistory && history.length === 0 ? (
              <p className="text-sm text-zinc-600">
                Aun no hay cortes registrados.
              </p>
            ) : null}
            {history.map((corte) => (
              <div
                key={corte._id}
                className="rounded-2xl border border-black/10 bg-white/70 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {new Date(corte.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-600">
                      Fondo validado: {corte.fondoValidado ? "Si" : "No"}
                      {corte.fondoValidado && corte.fondoCantidad !== undefined
                        ? ` (${corte.fondoCantidad.toFixed(2)})`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full bg-white px-3 py-1 text-xs ${
                      valueTone(corte.diferencia)
                    }`}
                  >
                    Diferencia {formatSigned(corte.diferencia)}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
                  <div>Corte teorico: {corte.corteTeorico.toFixed(2)}</div>
                  <div>Corte real: {corte.corteReal.toFixed(2)}</div>
                  <div>Depositado: {corte.depositado.toFixed(2)}</div>
                  <div className={valueTone(corte.pico)}>
                    Pico: {formatSigned(corte.pico)}
                  </div>
                  <div>
                    Pendientes:{" "}
                    {corte.pendientes?.length
                      ? `${corte.pendientes.filter((t) => t.done).length}/${
                          corte.pendientes.length
                        }`
                      : "0"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
