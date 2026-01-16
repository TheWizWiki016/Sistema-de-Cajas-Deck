"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Item = {
  _id: string;
  nombre: string;
  alfanumerico: string;
  codigoBarras?: string;
  upc?: string;
};

type SelectiveCount = {
  _id: string;
  username: string;
  totals: {
    real: number;
    items: number;
  };
  lines: {
    itemId: string;
    sku: string;
    nombre: string;
    codigoBarras?: string;
    real: number;
  }[];
  createdAt: string;
};

export default function ConteoSelectivoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [manualLookup, setManualLookup] = useState("");
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [unitInputs, setUnitInputs] = useState<Record<string, string>>({});
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<SelectiveCount[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadItems = async () => {
    setLoadingItems(true);
    try {
      const response = await fetch("/api/conteos/items");
      const data = (await response.json()) as { articulos?: Item[]; message?: string };
      if (!response.ok) {
        toast.error(data.message ?? "No se pudieron cargar los articulos.");
        return;
      }
      setItems(data.articulos ?? []);
    } catch (error) {
      toast.error("Error de red al cargar articulos.");
    } finally {
      setLoadingItems(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/conteos-selectivos");
      const data = (await response.json()) as { conteos?: SelectiveCount[] };
      if (response.ok) {
        setHistory(data.conteos ?? []);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadItems();
    loadHistory();
  }, []);

  useEffect(() => {
    if (selectedItems.length === 0) {
      setCurrentIndex(0);
      return;
    }
    if (currentIndex >= selectedItems.length) {
      setCurrentIndex(selectedItems.length - 1);
    }
  }, [selectedItems.length, currentIndex]);

  useEffect(() => {
    if (!scannerOpen) {
      if (readerRef.current) {
        const reader = readerRef.current as unknown as {
          reset?: () => void;
          stopContinuousDecode?: () => void;
          stopStreams?: () => void;
        };
        if (reader.stopContinuousDecode) {
          reader.stopContinuousDecode();
        } else if (reader.reset) {
          reader.reset();
        } else if (reader.stopStreams) {
          reader.stopStreams();
        }
        readerRef.current = null;
      }
      return;
    }

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let active = true;

    const startScan = async () => {
      if (!videoRef.current) {
        return;
      }
      try {
        await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err) => {
            if (!active) {
              return;
            }
            if (result) {
              const scanned = result.getText().trim();
              handleLookup(scanned);
              setScannerOpen(false);
            } else if (err && err.name !== "NotFoundException") {
              toast.error("No se pudo leer el codigo.");
            }
          }
        );
      } catch (error) {
        toast.error("No se pudo iniciar la camara.");
      }
    };

    startScan();

    return () => {
      active = false;
      try {
        const cleanupReader = reader as unknown as {
          reset?: () => void;
          stopContinuousDecode?: () => void;
          stopStreams?: () => void;
        };
        if (cleanupReader.stopContinuousDecode) {
          cleanupReader.stopContinuousDecode();
        } else if (cleanupReader.reset) {
          cleanupReader.reset();
        } else if (cleanupReader.stopStreams) {
          cleanupReader.stopStreams();
        }
      } catch (error) {
        // Ignore cleanup errors.
      }
      readerRef.current = null;
    };
  }, [scannerOpen, items]);

  const handleLookup = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      return;
    }
    const matched = items.find((item) => {
      return (
        item.alfanumerico?.toLowerCase() === trimmed ||
        item.codigoBarras?.toLowerCase() === trimmed ||
        item.upc?.toLowerCase() === trimmed
      );
    });
    if (!matched) {
      toast.error("Producto no encontrado.");
      return;
    }
    setSelectedItems((prev) => {
      if (prev.some((line) => line._id === matched._id)) {
        toast.info("Este producto ya esta en el conteo.");
        return prev;
      }
      return [...prev, matched];
    });
  };

  const updateUnitCount = (id: string, value: string) => {
    setUnitInputs((prev) => ({ ...prev, [id]: value }));
    if (value.trim() === "") {
      setUnitCounts((prev) => ({ ...prev, [id]: 0 }));
      return;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }
    setUnitCounts((prev) => ({ ...prev, [id]: parsed }));
  };

  const removeSelected = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((line) => line._id !== itemId));
    setUnitInputs((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setUnitCounts((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const saveCount = async () => {
    if (selectedItems.length === 0) {
      toast.error("Agrega al menos un producto.");
      return;
    }

    const payload = selectedItems.map((item) => ({
      itemId: item._id,
      sku: item.alfanumerico,
      nombre: item.nombre,
      codigoBarras: item.codigoBarras,
      real: unitCounts[item._id],
    }));

    if (payload.some((line) => line.real === undefined || line.real < 0)) {
      toast.error("Completa cantidades validas.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/conteos-selectivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: payload.map((line) => ({
            ...line,
            real: line.real as number,
          })),
        }),
      });
      const data = (await response.json()) as { message?: string; ok?: boolean };
      if (!response.ok || !data.ok) {
        toast.error(data.message ?? "No se pudo guardar el conteo.");
        return;
      }
      toast.success("Conteo selectivo guardado.");
      setSelectedItems([]);
      setUnitInputs({});
      setUnitCounts({});
      setCurrentIndex(0);
      loadHistory();
    } catch (error) {
      toast.error("Error de red al guardar el conteo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-zinc-100">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#0f3d36] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#7c1127] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Inventario
            </p>
            <h1 className="text-3xl font-semibold">Conteos selectivos</h1>
            <p className="text-sm text-zinc-400">
              Cuenta productos especificos y guarda el registro.
            </p>
          </div>
          <a
            className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#7c1127]"
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
                  Agrega productos con codigo o scanner.
                </p>
              </div>
              <button
                className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#0f3d36] sm:text-sm"
                type="button"
                onClick={() => {
                  setSelectedItems([]);
                  setUnitInputs({});
                  setUnitCounts({});
                  setCurrentIndex(0);
                }}
                disabled={selectedItems.length === 0}
              >
                Limpiar
              </button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[var(--panel-90)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Agregar producto
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  className="flex-1 rounded-2xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                  placeholder="Codigo, alfanumerico o UPC"
                  value={manualLookup}
                  onChange={(event) => setManualLookup(event.target.value)}
                />
                <button
                  className="rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-100 hover:border-[#0f3d36]"
                  type="button"
                  onClick={() => {
                    handleLookup(manualLookup);
                    setManualLookup("");
                  }}
                  disabled={loadingItems}
                >
                  Agregar
                </button>
                <button
                  className="rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-100 hover:border-[#7c1127]"
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  disabled={loadingItems}
                >
                  Escanear
                </button>
              </div>
              {loadingItems ? (
                <p className="mt-2 text-xs text-zinc-500">Cargando articulos...</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-400">
                {selectedItems.length > 0
                  ? `Producto ${currentIndex + 1} de ${selectedItems.length}`
                  : "Sin productos seleccionados"}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <button
                  className="w-full rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#0f3d36] disabled:opacity-60 sm:w-auto sm:text-sm"
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                >
                  Anterior
                </button>
                <button
                  className="w-full rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#7c1127] disabled:opacity-60 sm:w-auto sm:text-sm"
                  type="button"
                  onClick={() =>
                    setCurrentIndex((prev) =>
                      Math.min(selectedItems.length - 1, prev + 1)
                    )
                  }
                  disabled={currentIndex >= selectedItems.length - 1}
                >
                  Siguiente
                </button>
                <button
                  className="w-full rounded-full bg-[#0f3d36] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0b2a24] disabled:opacity-70 sm:w-auto sm:text-sm"
                  type="button"
                  onClick={saveCount}
                  disabled={saving || selectedItems.length === 0}
                >
                  {saving ? "Guardando..." : "Guardar conteo"}
                </button>
              </div>
            </div>

            {selectedItems.length > 0 ? (
              (() => {
                const currentItem = selectedItems[currentIndex];
                const unidadesInput = unitInputs[currentItem._id] ?? "";
                const unidades = unitCounts[currentItem._id] ?? 0;
                return (
                  <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-5 shadow-[0_30px_60px_-40px_rgba(180,83,9,0.35)] sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
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
                        <button
                          className="rounded-full border border-white/10 bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-red-400 hover:border-red-400"
                          type="button"
                          onClick={() => removeSelected(currentItem._id)}
                        >
                          Quitar producto
                        </button>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-300">
                        Total: {unidades} piezas
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <label className="space-y-1 text-xs text-zinc-400">
                        Piezas contadas
                        <input
                          className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-base text-zinc-100 outline-none focus:border-[#b45309]"
                          inputMode="numeric"
                          value={unidadesInput}
                          onChange={(event) =>
                            updateUnitCount(currentItem._id, event.target.value)
                          }
                        />
                      </label>
                      <div className="rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-300">
                        Total actual: {unidades}
                      </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-white/10 bg-[var(--surface)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        Teclado
                      </p>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                          (key) => (
                            <button
                              key={key}
                              className="rounded-2xl border border-white/10 bg-[var(--panel)] py-3 text-base font-semibold text-zinc-100 active:scale-[0.98]"
                              type="button"
                              onClick={() =>
                                updateUnitCount(
                                  currentItem._id,
                                  `${unidadesInput}${key}`
                                )
                              }
                            >
                              {key}
                            </button>
                          )
                        )}
                        <button
                          className="rounded-2xl border border-white/10 bg-[var(--panel)] py-3 text-base font-semibold text-zinc-100 active:scale-[0.98]"
                          type="button"
                          onClick={() =>
                            updateUnitCount(
                              currentItem._id,
                              unidadesInput.slice(0, -1)
                            )
                          }
                        >
                          Borrar
                        </button>
                        <button
                          className="rounded-2xl border border-white/10 bg-[var(--panel)] py-3 text-base font-semibold text-zinc-100 active:scale-[0.98]"
                          type="button"
                          onClick={() =>
                            updateUnitCount(currentItem._id, `${unidadesInput}0`)
                          }
                        >
                          0
                        </button>
                        <button
                          className="rounded-2xl border border-white/10 bg-[var(--panel)] py-3 text-base font-semibold text-zinc-100 active:scale-[0.98]"
                          type="button"
                          onClick={() => updateUnitCount(currentItem._id, "")}
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-zinc-400">
                Agrega un producto con codigo o escaner para comenzar.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
            <h2 className="text-xl font-semibold">Historico</h2>
            <p className="text-sm text-zinc-400">
              Ultimos conteos selectivos guardados.
            </p>
            </div>
            <button
              className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-100 hover:border-[#0f3d36]"
              type="button"
              onClick={loadHistory}
            >
              Actualizar
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {loadingHistory ? (
              <p className="text-sm text-zinc-400">Cargando historico...</p>
            ) : null}
            {!loadingHistory && history.length === 0 ? (
              <p className="text-sm text-zinc-400">Aun no hay registros.</p>
            ) : null}
            {history.map((conteo) => (
              <div
                key={conteo._id}
                className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {new Date(conteo.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {conteo.totals.items} productos - Total real{" "}
                      {conteo.totals.real}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {conteo.username ?? "Usuario"}
                  </span>
                </div>
                {conteo.lines.length ? (
                  <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
                    {conteo.lines.map((line) => (
                      <div key={`${conteo._id}-${line.itemId}`}>
                        {line.nombre || line.sku}: {line.real}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </main>

      {scannerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-lg space-y-4 rounded-3xl border border-white/10 bg-[var(--panel)] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">
                Escanear codigo de barras
              </h3>
              <button
                className="rounded-full border border-white/10 bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-zinc-200"
                type="button"
                onClick={() => setScannerOpen(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video ref={videoRef} className="h-72 w-full object-cover" />
            </div>
            <p className="text-xs text-zinc-400">
              Permite el acceso a la camara y apunta al codigo de barras.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
