"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type BeerItem = {
  _id: string;
  nombre: string;
  alfanumerico: string;
  upc?: string;
  cantidadPorCaja?: number | null;
  familias: string[];
};

type ItemsResponse = {
  articulos?: BeerItem[];
  message?: string;
};

const CERVEZA_ORDER = [
  "CE1010001",
  "CE1010002",
  "CE1010007",
  "CE1010008",
  "CE1010012",
  "CE1010016",
  "CE1010040",
  "CE1010049",
  "CE1010065",
  "CE1010067",
  "CE1010073",
  "CE1010077",
  "CE1010079",
  "CE1010080",
  "CE1010081",
  "CE1010083",
  "CE1010123",
  "CE1010128",
  "CE1010131",
  "CE1010132",
  "CE1010152",
  "CE1010179",
  "CE1010180",
  "CE1010181",
  "CE1010185",
  "CE1010186",
  "CE1010193",
  "CE1010199",
  "CE1010201",
  "CE1010210",
  "CE1010211",
  "CE1010235",
  "CE1010236",
  "CE1010237",
  "CE1010239",
  "CE1010248",
  "CE1010266",
  "CE1010268",
  "CE1010275",
  "CE1010278",
  "CE1010279",
  "CE1010283",
  "CE1010284",
  "CE1019476",
  "CE1020027",
  "CE1020080",
  "CE1020096",
  "CE1020104",
  "CE1020116",
  "CE1020125",
  "CE1030011",
  "CE1030027",
  "CE1030029",
];

export default function ConteoDeCervezaPage() {
  const router = useRouter();
  const [items, setItems] = useState<BeerItem[]>([]);
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});
  const [unitInputs, setUnitInputs] = useState<Record<string, string>>({});
  const [boxInputs, setBoxInputs] = useState<Record<string, string>>({});
  const [boxCounts, setBoxCounts] = useState<Record<string, number>>({});
  const [theoreticalUnits, setTheoreticalUnits] = useState<Record<string, string>>(
    {}
  );
  const [missingImages, setMissingImages] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<"count" | "theoretical">("count");
  const [saving, setSaving] = useState(false);
  const [ticketFolio, setTicketFolio] = useState("");
  const [activeField, setActiveField] = useState<"units" | "boxes">("units");
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [changeIssues, setChangeIssues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/conteos/items");
        const data = (await response.json()) as ItemsResponse;
        if (!response.ok) {
          toast.error(data.message ?? "No se pudieron cargar los articulos.");
          return;
        }
        const all = data.articulos ?? [];
        setItems(all);
      } catch (error) {
        toast.error("Error de red al cargar articulos.");
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  const cervezaItems = useMemo(() => {
    const orderIndex = new Map(
      CERVEZA_ORDER.map((code, index) => [code.toUpperCase(), index])
    );
    return items
      .filter((item) => {
        const alfanumerico = item.alfanumerico?.trim().toUpperCase();
        if (alfanumerico.startsWith("CE")) {
          return true;
        }
        return (item.familias ?? []).some(
          (familia) => familia.trim().toLowerCase() === "cerveza"
        );
      })
      .sort((a, b) => {
        const codeA = a.alfanumerico?.trim().toUpperCase();
        const codeB = b.alfanumerico?.trim().toUpperCase();
        const indexA = orderIndex.get(codeA) ?? Number.MAX_SAFE_INTEGER;
        const indexB = orderIndex.get(codeB) ?? Number.MAX_SAFE_INTEGER;
        if (indexA !== indexB) {
          return indexA - indexB;
        }
        return codeA.localeCompare(codeB);
      });
  }, [items]);

  useEffect(() => {
    if (currentIndex >= cervezaItems.length && cervezaItems.length > 0) {
      setCurrentIndex(cervezaItems.length - 1);
    }
  }, [cervezaItems.length, currentIndex]);

  const updateUnitCount = (id: string, value: string) => {
    setUnitInputs((prev) => ({ ...prev, [id]: value }));
    const pieces = value
      .split("+")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => Number(part));
    if (pieces.length === 0 || pieces.some((num) => Number.isNaN(num) || num < 0)) {
      return;
    }
    const total = pieces.reduce((sum, num) => sum + num, 0);
    setUnitCounts((prev) => ({ ...prev, [id]: total }));
  };

  const updateBoxCount = (id: string, value: string) => {
    setBoxInputs((prev) => ({ ...prev, [id]: value }));
    if (value.trim() === "") {
      setBoxCounts((prev) => ({ ...prev, [id]: 0 }));
      return;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }
    setBoxCounts((prev) => ({ ...prev, [id]: parsed }));
  };

  const updateTheoreticalUnits = (id: string, value: string) => {
    setTheoreticalUnits((prev) => ({ ...prev, [id]: value }));
  };

  const clearCounts = () => {
    const ok = window.confirm("Limpiar todo el conteo de cerveza?");
    if (!ok) {
      return;
    }
    setUnitCounts({});
    setUnitInputs({});
    setBoxInputs({});
    setBoxCounts({});
    setTheoreticalUnits({});
    setTicketFolio("");
  };

  const currentItem =
    cervezaItems.length > 0 ? cervezaItems[currentIndex] : null;

  const markNonexistent = () => {
    if (!currentItem) {
      return;
    }
    setUnitInputs((prev) => ({ ...prev, [currentItem._id]: "0" }));
    setBoxInputs((prev) => ({ ...prev, [currentItem._id]: "0" }));
    setUnitCounts((prev) => ({ ...prev, [currentItem._id]: 0 }));
    setBoxCounts((prev) => ({ ...prev, [currentItem._id]: 0 }));
    setCurrentIndex((prev) =>
      Math.min(cervezaItems.length - 1, prev + 1)
    );
  };

  const isCounted = (id: string) =>
    Object.prototype.hasOwnProperty.call(unitCounts, id) ||
    Object.prototype.hasOwnProperty.call(boxCounts, id);

  const missingCount = cervezaItems.filter((item) => !isCounted(item._id)).length;

  const finalizeCount = () => {
    if (missingCount > 0) {
      toast.error(`Faltan ${missingCount} articulos por contar.`);
      return;
    }
    setStep("theoretical");
  };

  const parseNonNegative = (value: string) => {
    if (value.trim() === "") {
      return null;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      return null;
    }
    return parsed;
  };

  const saveCount = async () => {
    if (saving) {
      return;
    }
    if (!ticketFolio.trim()) {
      toast.error("Agrega el folio del ticket teorico.");
      return;
    }

    let lines: Array<{
      itemId: string;
      nombre: string;
      alfanumerico: string;
      upc: string;
      cantidadPorCaja: number | null;
      fisicoUnidades: number;
      fisicoCajas: number;
      teoricoUnidades: number;
      teoricoCajas: number;
    }>;

    try {
      lines = cervezaItems.map((item) => {
        const fisicoCajas = boxCounts[item._id] ?? 0;
        const piezasPorCaja = item.cantidadPorCaja ?? 0;
        const fisicoUnidades =
          (unitCounts[item._id] ?? 0) + fisicoCajas * piezasPorCaja;
        const teoricoUnidades = parseNonNegative(
          theoreticalUnits[item._id] ?? ""
        );

        if (teoricoUnidades === null) {
          throw new Error(
            `Completa el teorico en piezas para ${item.nombre || item.alfanumerico}.`
          );
        }
        const teoricoCajas =
          item.cantidadPorCaja && item.cantidadPorCaja > 0
            ? teoricoUnidades / item.cantidadPorCaja
            : 0;

        return {
          itemId: item._id,
          nombre: item.nombre,
          alfanumerico: item.alfanumerico,
          upc: item.upc ?? "",
          cantidadPorCaja: item.cantidadPorCaja ?? null,
          fisicoUnidades,
          fisicoCajas,
          teoricoUnidades,
          teoricoCajas,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      toast.error(message ?? "Completa los teoricos antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      const ok = window.confirm(
        "Estas seguro de que los datos son correctos?"
      );
      if (!ok) {
        setSaving(false);
        return;
      }
      const response = await fetch("/api/beer-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, ticketFolio: ticketFolio.trim() }),
      });
      const data = (await response.json()) as { message?: string; ok?: boolean };
      if (!response.ok || !data.ok) {
        toast.error(data.message ?? "No se pudo guardar el conteo.");
        return;
      }
      toast.success("Conteo guardado.");
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      toast.error(message ?? "Error de red al guardar el conteo.");
    } finally {
      setSaving(false);
    }
  };

  const openChangeModal = () => {
    if (!currentItem) {
      return;
    }
    setChangeIssues({});
    setChangeNotes("");
    setChangeModalOpen(true);
  };

  const toggleChangeIssue = (key: string) => {
    setChangeIssues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const submitChangeRequest = async () => {
    if (!currentItem) {
      return;
    }
    const issues = Object.keys(changeIssues).filter((key) => changeIssues[key]);
    if (issues.length === 0) {
      toast.error("Selecciona al menos un motivo.");
      return;
    }
    try {
      const response = await fetch("/api/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: currentItem._id,
          alfanumerico: currentItem.alfanumerico,
          nombre: currentItem.nombre,
          upc: currentItem.upc ?? "",
          issues,
          notes: changeNotes,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        toast.error(data.message ?? "No se pudo enviar el reporte.");
        return;
      }
      toast.success("Reporte enviado.");
      setChangeModalOpen(false);
    } catch (error) {
      toast.error("Error de red al enviar el reporte.");
    }
  };

  const updateActiveInput = (value: string) => {
    if (!currentItem) {
      return;
    }
    if (activeField === "units") {
      updateUnitCount(currentItem._id, value);
    } else {
      updateBoxCount(currentItem._id, value);
    }
  };

  const handleKeypadInput = (key: string) => {
    if (!currentItem) {
      return;
    }
    const currentValue =
      activeField === "units"
        ? unitInputs[currentItem._id] ?? ""
        : boxInputs[currentItem._id] ?? "";

    if (key === "clear") {
      updateActiveInput("");
      return;
    }
    if (key === "backspace") {
      updateActiveInput(currentValue.slice(0, -1));
      return;
    }
    if (key === "+") {
      if (activeField !== "units") {
        return;
      }
      if (!currentValue || currentValue.endsWith("+")) {
        return;
      }
      updateActiveInput(`${currentValue}+`);
      return;
    }

    if (!/^\d$/.test(key)) {
      return;
    }
    updateActiveInput(`${currentValue}${key}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-zinc-100">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#b45309] opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#0f3d36] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.07),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-10 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Inventario
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">Conteo de cerveza</h1>
            <p className="text-sm text-zinc-400">
              Registra la cantidad de cajas o piezas por etiqueta.
            </p>
          </div>
          <a
            className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#b45309]"
            href="/dashboard"
          >
            Volver al dashboard
          </a>
        </header>

        <section className="mt-6 space-y-6 sm:mt-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--panel-90)] p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Acciones
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {step === "count"
                    ? "Limpia el conteo actual."
                    : "Captura teoricos y guarda el conteo."}
                </p>
              </div>
              <button
                className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#b45309] sm:text-sm"
                type="button"
                onClick={clearCounts}
                disabled={cervezaItems.length === 0}
              >
                Limpiar
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-400">Cargando articulos...</p>
          ) : cervezaItems.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No hay articulos de cerveza registrados.
            </p>
          ) : step === "theoretical" ? (
            <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.45)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Teorico vs fisico</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Ingresa el teorico manual para cada articulo.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <button
                    className="w-full rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#0f3d36] sm:w-auto sm:text-sm"
                    type="button"
                    onClick={() => setStep("count")}
                    disabled={saving}
                  >
                    Volver al conteo
                  </button>
                  <button
                    className="w-full rounded-full bg-[#0f3d36] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0b2a24] disabled:opacity-70 sm:w-auto sm:text-sm"
                    type="button"
                    onClick={saveCount}
                    disabled={saving}
                  >
                    {saving ? "Guardando..." : "Guardar conteo"}
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[var(--panel)] p-4">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-zinc-300">
                      Folio ticket teorico
                    </span>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-base text-zinc-100 outline-none focus:border-[#0f3d36]"
                      placeholder="Ej. T-000123"
                      value={ticketFolio}
                      onChange={(event) => setTicketFolio(event.target.value)}
                    />
                  </label>
                </div>
                {cervezaItems.map((item) => {
                  const fisicoCajas = boxCounts[item._id] ?? 0;
                  const porCaja = item.cantidadPorCaja ?? null;
                  const piezasPorCaja = porCaja ?? 0;
                  const fisicoUnidades =
                    (unitCounts[item._id] ?? 0) + fisicoCajas * piezasPorCaja;
                  const teoricoUnidadesRaw = theoreticalUnits[item._id] ?? "";
                  const teoricoUnidades = parseNonNegative(teoricoUnidadesRaw);
                  const diferencia =
                    teoricoUnidades === null ? null : fisicoUnidades - teoricoUnidades;
                  const badgeClass =
                    diferencia === null
                      ? "text-zinc-400"
                      : diferencia >= 0
                      ? "text-emerald-400"
                      : "text-rose-400";
                  const imgKey = item.upc ?? "";
                  const imageMissing = imgKey ? missingImages[imgKey] : true;

                  return (
                    <div
                      key={item._id}
                      className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-[var(--panel)]">
                            {!imageMissing && imgKey ? (
                              <img
                                className="h-full w-full object-cover"
                                src={`/api/beer-images/${imgKey}`}
                                alt={item.nombre || item.alfanumerico}
                                onError={() =>
                                  setMissingImages((prev) => ({
                                    ...prev,
                                    [imgKey]: true,
                                  }))
                                }
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                                Sin
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-100">
                              {item.nombre || item.alfanumerico}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {item.alfanumerico}
                              {item.upc ? ` - UPC ${item.upc}` : ""}
                            </p>
                            {porCaja ? (
                              <p className="mt-1 text-xs text-zinc-500">
                                {porCaja} piezas por caja
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-xs text-zinc-400">
                          <p className="text-sm text-zinc-300">
                            Fisico piezas: {fisicoUnidades}
                          </p>
                          <p className={badgeClass}>
                            {diferencia === null
                              ? "Faltante/Sobrante: --"
                              : diferencia >= 0
                              ? `Sobrante: ${diferencia}`
                              : `Faltante: ${Math.abs(diferencia)}`}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-xs text-zinc-400">
                          Fisico total (piezas)
                          <input
                            className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-4 py-3 text-base text-zinc-100 opacity-80"
                            value={fisicoUnidades}
                            readOnly
                          />
                        </label>
                        <label className="space-y-1 text-xs text-zinc-400">
                          Teorico piezas
                          <input
                            className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-4 py-3 text-base text-zinc-100 outline-none focus:border-[#0f3d36]"
                            type="number"
                            min="0"
                            step="1"
                            value={teoricoUnidadesRaw}
                            onChange={(event) =>
                              updateTheoreticalUnits(item._id, event.target.value)
                            }
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-400">
                  {currentItem
                    ? `Articulo ${currentIndex + 1} de ${cervezaItems.length}`
                    : "Sin articulos"}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <button
                    className="w-full rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#b45309] disabled:opacity-60 sm:w-auto sm:text-sm"
                    type="button"
                    onClick={markNonexistent}
                    disabled={!currentItem}
                  >
                    Articulo inexistente
                  </button>
                  <button
                    className="w-full rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#b45309] disabled:opacity-60 sm:w-auto sm:text-sm"
                    type="button"
                    onClick={openChangeModal}
                    disabled={!currentItem}
                  >
                    Solicitar cambio
                  </button>
                  <button
                    className="w-full rounded-full bg-[#0f3d36] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0b2a24] disabled:opacity-70 sm:w-auto sm:text-sm"
                    type="button"
                    onClick={finalizeCount}
                  >
                    Finalizar conteo
                  </button>
                  <button
                    className="w-full rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#b45309] disabled:opacity-60 sm:w-auto sm:text-sm"
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                  >
                    Anterior
                  </button>
                  <button
                    className="w-full rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#b45309] disabled:opacity-60 sm:w-auto sm:text-sm"
                    type="button"
                    onClick={() =>
                      setCurrentIndex((prev) =>
                        Math.min(cervezaItems.length - 1, prev + 1)
                      )
                    }
                    disabled={currentIndex >= cervezaItems.length - 1}
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              {currentItem ? (() => {
                const unidades = unitCounts[currentItem._id] ?? 0;
                const unidadesInput = unitInputs[currentItem._id] ?? "";
                const cajas = boxCounts[currentItem._id] ?? 0;
                const cajasInput = boxInputs[currentItem._id] ?? "";
                const porCaja = currentItem.cantidadPorCaja ?? null;
                const imgKey = currentItem.upc ?? "";
                const imageMissing = imgKey ? missingImages[imgKey] : true;
                const totalUnidadesItem = porCaja
                  ? unidades + cajas * porCaja
                  : unidades;

                return (
                  <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-5 shadow-[0_30px_60px_-40px_rgba(180,83,9,0.35)] sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                      <div className="h-28 w-28 overflow-hidden rounded-3xl border border-white/10 bg-[var(--surface)] sm:h-32 sm:w-32">
                        {!imageMissing && imgKey ? (
                          <img
                            className="h-full w-full object-cover"
                            src={`/api/beer-images/${imgKey}`}
                            alt={currentItem.nombre || currentItem.alfanumerico}
                            onError={() =>
                              setMissingImages((prev) => ({
                                ...prev,
                                [imgKey]: true,
                              }))
                            }
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                            Sin imagen
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-lg font-semibold text-zinc-100">
                            {currentItem.nombre || currentItem.alfanumerico}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {currentItem.alfanumerico}
                            {currentItem.upc ? ` - UPC ${currentItem.upc}` : ""}
                          </p>
                        </div>
                        {porCaja ? (
                          <p className="text-xs text-zinc-500">
                            {porCaja} piezas por caja
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      <label className="space-y-1 text-xs text-zinc-400">
                        Cajas contadas
                        <input
                          className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-base text-zinc-100 outline-none focus:border-[#b45309] disabled:opacity-60"
                          type="number"
                          min="0"
                          step="1"
                          value={cajasInput}
                          onChange={(event) =>
                            updateBoxCount(currentItem._id, event.target.value)
                          }
                          onFocus={() => setActiveField("boxes")}
                          disabled={!porCaja}
                        />
                      </label>
                      <label className="space-y-1 text-xs text-zinc-400">
                        Piezas contadas
                        <input
                          className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-base text-zinc-100 outline-none focus:border-[#b45309]"
                          inputMode="numeric"
                          placeholder="Ej. 52+58+25"
                          value={unidadesInput}
                          onChange={(event) =>
                            updateUnitCount(currentItem._id, event.target.value)
                          }
                          onFocus={() => setActiveField("units")}
                        />
                      </label>
                      <div className="rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-300">
                        Total: {totalUnidadesItem} piezas
                        {porCaja
                          ? ` (${(totalUnidadesItem / porCaja).toFixed(2)} cajas)`
                          : ""}
                      </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-white/10 bg-[var(--surface)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        Teclado
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {activeField === "units"
                          ? "Captura piezas (usa + para sumar)."
                          : "Captura cajas."}
                      </p>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                          (key) => (
                            <button
                              key={key}
                              className="rounded-2xl border border-white/10 bg-[var(--panel)] py-3 text-base font-semibold text-zinc-100 active:scale-[0.98]"
                              type="button"
                              onClick={() => handleKeypadInput(key)}
                            >
                              {key}
                            </button>
                          )
                        )}
                        <button
                          className="rounded-2xl border border-white/10 bg-[var(--panel)] py-3 text-base font-semibold text-zinc-100 active:scale-[0.98] disabled:opacity-50"
                          type="button"
                          onClick={() => handleKeypadInput("+")}
                          disabled={activeField !== "units"}
                        >
                          +
                        </button>
                        <button
                          className="rounded-2xl border border-white/10 bg-[var(--panel)] py-3 text-base font-semibold text-zinc-100 active:scale-[0.98]"
                          type="button"
                          onClick={() => handleKeypadInput("0")}
                        >
                          0
                        </button>
                        <button
                          className="rounded-2xl border border-white/10 bg-[var(--panel)] py-3 text-base font-semibold text-zinc-100 active:scale-[0.98]"
                          type="button"
                          onClick={() => handleKeypadInput("backspace")}
                        >
                          Borrar
                        </button>
                      </div>
                      <div className="mt-3">
                        <button
                          className="w-full rounded-2xl border border-white/10 bg-[var(--panel)] py-3 text-sm font-semibold text-zinc-100 active:scale-[0.99]"
                          type="button"
                          onClick={() => handleKeypadInput("clear")}
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })() : null}
            </div>
          )}
        </section>
      </main>

      {changeModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[var(--panel)] p-6 shadow-[0_40px_80px_-50px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Solicitar cambio</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Reporta errores en el articulo actual.
                </p>
              </div>
              <button
                className="rounded-full border border-white/10 bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-zinc-200"
                type="button"
                onClick={() => setChangeModalOpen(false)}
              >
                Cerrar
              </button>
            </div>

            {currentItem ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
                <p className="text-sm font-semibold text-zinc-100">
                  {currentItem.nombre || currentItem.alfanumerico}
                </p>
                <p className="text-xs text-zinc-400">
                  {currentItem.alfanumerico}
                  {currentItem.upc ? ` - UPC ${currentItem.upc}` : ""}
                </p>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { key: "nombre", label: "Nombre" },
                { key: "imagen", label: "Imagen" },
                { key: "codigo", label: "Codigo" },
                { key: "cajas", label: "Cajas" },
              ].map((issue) => (
                <label
                  key={issue.key}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-200"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#b45309]"
                    checked={Boolean(changeIssues[issue.key])}
                    onChange={() => toggleChangeIssue(issue.key)}
                  />
                  {issue.label}
                </label>
              ))}
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-sm text-zinc-300">Notas</span>
              <textarea
                className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#b45309]"
                rows={3}
                placeholder="Describe el problema..."
                value={changeNotes}
                onChange={(event) => setChangeNotes(event.target.value)}
              />
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200"
                type="button"
                onClick={() => setChangeModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded-full bg-[#b45309] px-4 py-2 text-xs font-semibold text-white hover:bg-[#92400e]"
                type="button"
                onClick={submitChangeRequest}
              >
                Enviar reporte
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
