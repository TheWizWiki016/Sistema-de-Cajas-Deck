"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Task = {
  id: string;
  text: string;
  done: boolean;
};

type Corte = {
  _id: string;
  caja: string;
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

const CAJAS = ["Caja 1", "Caja 2"];

const parseNumberInput = (value: string) => {
  const normalized = value.replace(/[^\d.,-]/g, "").trim();
  if (!normalized) {
    return null;
  }
  const usesCommaAsDecimal = normalized.includes(",") && !normalized.includes(".");
  const cleaned = usesCommaAsDecimal
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized.replace(/,/g, "");
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
};

export default function CortesPage() {
  const [corteTeorico, setCorteTeorico] = useState("");
  const [corteReal, setCorteReal] = useState("");
  const [depositado, setDepositado] = useState("");
  const [caja, setCaja] = useState("");
  const [fondoValidado, setFondoValidado] = useState<"si" | "no">("no");
  const [fondoCantidad, setFondoCantidad] = useState("");
  const [pendientes, setPendientes] = useState<Task[]>([]);
  const [nuevoPendiente, setNuevoPendiente] = useState("");
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

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
      }),
    []
  );
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const formatNumberInput = (value: string) => {
    const parsed = parseNumberInput(value);
    return parsed === null ? "" : numberFormatter.format(parsed);
  };

  const diferencia = useMemo(() => {
    const teorico = parseNumberInput(corteTeorico);
    const real = parseNumberInput(corteReal);
    if (teorico === null || real === null) {
      return null;
    }
    return real - teorico;
  }, [corteTeorico, corteReal]);

  const pico = useMemo(() => {
    const real = parseNumberInput(corteReal);
    const dep = parseNumberInput(depositado);
    if (real === null || dep === null) {
      return null;
    }
    return real - dep;
  }, [corteReal, depositado]);

  const formatCurrency = (value: number) => currencyFormatter.format(value);

  const formatSignedCurrency = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatCurrency(value)}`;
  };

  const valueTone = (value: number) =>
    value < 0
      ? "text-red-400"
      : value > 0
      ? "text-emerald-400"
      : "text-zinc-100";

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

    const corteTeoricoValue = parseNumberInput(corteTeorico);
    const corteRealValue = parseNumberInput(corteReal);
    const depositadoValue = parseNumberInput(depositado);
    const fondoCantidadValue = parseNumberInput(fondoCantidad);

    if (!caja) {
      toast.error("Selecciona una caja.");
      return;
    }

    if (corteTeoricoValue === null || corteRealValue === null) {
      toast.error("Completa corte teorico y corte real.");
      return;
    }

    if (depositadoValue === null) {
      toast.error("Ingresa el monto depositado.");
      return;
    }

    if (fondoValidado === "si" && fondoCantidadValue === null) {
      toast.error("Ingresa la cantidad del fondo validado.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/cortes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caja,
          corteTeorico: corteTeoricoValue,
          corteReal: corteRealValue,
          diferencia: diferencia ?? 0,
          depositado: depositadoValue,
          pico: pico ?? 0,
          pendientes: pendientes.map((task) => ({
            text: task.text,
            done: task.done,
          })),
          fondoValidado: fondoValidado === "si",
          fondoCantidad:
            fondoValidado === "si" ? fondoCantidadValue ?? 0 : undefined,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        toast.error(data.message ?? "No se pudo guardar el corte.");
        return;
      }

      toast.success("Corte guardado correctamente.");
      setCaja("");
      setCorteTeorico("");
      setCorteReal("");
      setDepositado("");
      setFondoValidado("no");
      setFondoCantidad("");
      setPendientes([]);
      setNuevoPendiente("");
      loadHistory();
    } catch (error) {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-3xl font-semibold">Corte de caja</h1>
            <p className="text-sm text-zinc-400">
              Registra corte teorico, real y pendientes del turno.
            </p>
          </div>
          <a
            className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#7c1127]"
            href="/dashboard"
          >
            Volver al dashboard
          </a>
        </header>

        <form
          className="mt-10 space-y-8 rounded-3xl border border-white/10 bg-gradient-to-br from-[#13131a]/90 via-[#101015]/90 to-[#0f0f14]/90 p-8 shadow-[0_30px_60px_-40px_rgba(124,17,39,0.55)] backdrop-blur"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Caja
                  </span>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-[#0c0c11] px-4 py-3 text-base text-zinc-100 outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                    value={caja}
                    onChange={(event) => setCaja(event.target.value)}
                  >
                    <option value="">Selecciona una caja</option>
                    {CAJAS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Corte teorico
                  </span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[#0c0c11] px-4 py-3 text-base text-zinc-100 outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                    type="text"
                    inputMode="decimal"
                    value={corteTeorico}
                    onChange={(event) => setCorteTeorico(event.target.value)}
                    onBlur={() => setCorteTeorico(formatNumberInput(corteTeorico))}
                    placeholder="0.00"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Corte real
                  </span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[#0c0c11] px-4 py-3 text-base text-zinc-100 outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                    type="text"
                    inputMode="decimal"
                    value={corteReal}
                    onChange={(event) => setCorteReal(event.target.value)}
                    onBlur={() => setCorteReal(formatNumberInput(corteReal))}
                    placeholder="0.00"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Depositado
                  </span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[#0c0c11] px-4 py-3 text-base text-zinc-100 outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                    type="text"
                    inputMode="decimal"
                    value={depositado}
                    onChange={(event) => setDepositado(event.target.value)}
                    onBlur={() => setDepositado(formatNumberInput(depositado))}
                    placeholder="0.00"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Fondo validado
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                  <label className="flex items-center gap-2">
                    <input
                      className="accent-[#7c1127]"
                      type="radio"
                      name="fondoValidado"
                      checked={fondoValidado === "si"}
                      onChange={() => setFondoValidado("si")}
                    />
                    Si
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      className="accent-[#7c1127]"
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
                    className="w-full rounded-2xl border border-white/10 bg-[#0c0c11] px-4 py-3 text-base text-zinc-100 outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                    type="text"
                    inputMode="decimal"
                    value={fondoCantidad}
                    onChange={(event) => setFondoCantidad(event.target.value)}
                    onBlur={() =>
                      setFondoCantidad(formatNumberInput(fondoCantidad))
                    }
                    placeholder="Cantidad del fondo"
                  />
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Pendientes
                  </p>
                  <span className="text-xs text-zinc-400">
                    {pendientes.filter((task) => task.done).length}/
                    {pendientes.length} completados
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <input
                    className="flex-1 rounded-2xl border border-white/10 bg-[#0c0c11] px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                    placeholder="Agregar pendiente"
                    value={nuevoPendiente}
                    onChange={(event) => setNuevoPendiente(event.target.value)}
                  />
                  <button
                    className="rounded-2xl border border-transparent bg-[#0f3d36] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#1a6b5f] hover:bg-[#0b2a24]"
                    type="button"
                    onClick={addPendiente}
                  >
                    Agregar
                  </button>
                </div>

                <div className="space-y-2">
                  {pendientes.length === 0 ? (
                    <p className="text-sm text-zinc-400">
                      No hay pendientes registrados.
                    </p>
                  ) : null}
                  {pendientes.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0c0c11] px-4 py-3"
                    >
                      <label className="flex items-center gap-3 text-sm text-zinc-300">
                        <input
                          className="accent-[#7c1127]"
                          type="checkbox"
                          checked={task.done}
                          onChange={() => togglePendiente(task.id)}
                        />
                        <span className={task.done ? "line-through" : ""}>
                          {task.text}
                        </span>
                      </label>
                      <button
                        className="text-xs font-semibold text-red-400"
                        type="button"
                        onClick={() => removePendiente(task.id)}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#0c0c11] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Diferencia
                </p>
                <p
                  className={`mt-2 text-2xl font-semibold ${
                    diferencia === null ? "text-zinc-100" : valueTone(diferencia)
                  }`}
                >
                  {diferencia === null ? "--" : formatSignedCurrency(diferencia)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0c0c11] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Pico
                </p>
                <p
                  className={`mt-2 text-2xl font-semibold ${
                    pico === null ? "text-zinc-100" : valueTone(pico)
                  }`}
                >
                  {pico === null ? "--" : formatSignedCurrency(pico)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0c0c11] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Fondo
                </p>
                <p className="mt-2 text-lg font-semibold text-zinc-100">
                  {fondoValidado === "si" && fondoCantidad
                    ? formatCurrency(parseNumberInput(fondoCantidad) ?? 0)
                    : "Sin validar"}
                </p>
              </div>
            </div>
          </div>

          <button
            className="w-full rounded-2xl bg-[#7c1127] px-4 py-3 text-base font-semibold text-white shadow-[0_12px_24px_-16px_rgba(124,17,39,0.9)] transition hover:-translate-y-[1px] hover:bg-[#5c0b1c] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar corte"}
          </button>
        </form>

        <section className="mt-10 rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.6)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Historico de cortes</h2>
              <p className="text-sm text-zinc-400">
                Ultimos registros guardados en la base de datos.
              </p>
            </div>
            <button
              className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#0f3d36] hover:text-white"
              type="button"
              onClick={loadHistory}
            >
              Actualizar
            </button>
          </div>

          <div className="mt-6 space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {loadingHistory ? (
              <p className="text-sm text-zinc-400">Cargando historico...</p>
            ) : null}
            {!loadingHistory && history.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Aun no hay cortes registrados.
              </p>
            ) : null}
            {history.map((corte) => (
              <div
                key={corte._id}
                className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {new Date(corte.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Fondo validado: {corte.fondoValidado ? "Si" : "No"}
                      {corte.fondoValidado && corte.fondoCantidad !== undefined
                        ? ` (${formatCurrency(corte.fondoCantidad)})`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full bg-[var(--panel)] px-3 py-1 text-xs ${
                      valueTone(corte.diferencia)
                    }`}
                  >
                    Diferencia {formatSignedCurrency(corte.diferencia)}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-zinc-300 sm:grid-cols-3">
                  <div>Caja: {corte.caja || "Sin caja"}</div>
                  <div>Corte teorico: {formatCurrency(corte.corteTeorico)}</div>
                  <div>Corte real: {formatCurrency(corte.corteReal)}</div>
                  <div>Depositado: {formatCurrency(corte.depositado)}</div>
                  <div className={valueTone(corte.pico)}>
                    Pico: {formatSignedCurrency(corte.pico)}
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
                {corte.pendientes?.length ? (
                  <div className="mt-4 space-y-2 text-sm text-zinc-300">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Pendientes guardados
                    </p>
                    <div className="space-y-2">
                      {corte.pendientes.map((task, index) => (
                        <div
                          key={`${corte._id}-${index}`}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--panel)] px-4 py-2"
                        >
                          <span
                            className={
                              task.done ? "text-emerald-400 line-through" : ""
                            }
                          >
                            {task.text}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {task.done ? "Listo" : "Pendiente"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}


