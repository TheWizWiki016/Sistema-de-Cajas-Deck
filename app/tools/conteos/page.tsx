"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type CountLine = {
  id: string;
  itemId?: string;
  sku: string;
  nombre: string;
  codigoBarras?: string;
  teorico: number;
  real: number;
  familia: string;
  notas: string;
};

type Familia = {
  _id: string;
  prefix: string;
  name: string;
};

const DRAFT_KEY = "conteosDraft";

type DraftPayload = {
  lines: CountLine[];
  selectedFamily: string;
  currentIndex: number;
};

const parseCantidad = (value: string) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const csvEscape = (value: string) => {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export default function ConteosPage() {
  const [sku, setSku] = useState("");
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [familia, setFamilia] = useState("");
  const [notas, setNotas] = useState("");
  const [lines, setLines] = useState<CountLine[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [familyFilter, setFamilyFilter] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [articulos, setArticulos] = useState<
    { _id: string; nombre: string; alfanumerico: string; codigoBarras?: string; familias: string[] }[]
  >([]);
  const [loadingArticulos, setLoadingArticulos] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [pendingScan, setPendingScan] = useState("");
  const [manualLookup, setManualLookup] = useState("");
  const [savingCount, setSavingCount] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as CountLine[] | DraftPayload;
      const payload = Array.isArray(parsed)
        ? { lines: parsed, selectedFamily: "", currentIndex: 0 }
        : parsed;
      if (Array.isArray(payload.lines)) {
        const normalized = payload.lines.map((line) => ({
          ...line,
          teorico:
            typeof (line as any).teorico === "number"
              ? (line as any).teorico
              : typeof (line as any).cantidad === "number"
              ? (line as any).cantidad
              : 0,
          real:
            typeof (line as any).real === "number"
              ? (line as any).real
              : typeof (line as any).cantidad === "number"
              ? (line as any).cantidad
              : 0,
        }));
        setLines(normalized);
      }
      if (typeof payload.selectedFamily === "string") {
        setSelectedFamily(payload.selectedFamily);
      }
      if (typeof payload.currentIndex === "number") {
        setCurrentIndex(payload.currentIndex);
      }
    } catch (error) {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    const loadFamilias = async () => {
      try {
        const response = await fetch("/api/familias");
        const data = (await response.json()) as { familias?: Familia[] };
        if (response.ok) {
          setFamilias(data.familias ?? []);
        }
      } catch (error) {
        setFamilias([]);
      }
    };
    loadFamilias();
  }, []);

  useEffect(() => {
    const loadArticulos = async () => {
      if (!selectedFamily && !scannerOpen) {
        return;
      }
      setLoadingArticulos(true);
      try {
        const response = await fetch("/api/conteos/items");
        const data = (await response.json()) as {
          articulos?: {
            _id: string;
            nombre: string;
            alfanumerico: string;
            codigoBarras?: string;
            familias: string[];
          }[];
          message?: string;
        };
        if (response.ok) {
          setArticulos(data.articulos ?? []);
        } else {
          toast.error(data.message ?? "No se pudieron cargar los articulos.");
        }
      } catch (error) {
        toast.error("Error de red al cargar articulos.");
      } finally {
        setLoadingArticulos(false);
      }
    };
    loadArticulos();
  }, [selectedFamily, scannerOpen]);

  useEffect(() => {
    const payload: DraftPayload = {
      lines,
      selectedFamily,
      currentIndex,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [lines, selectedFamily, currentIndex]);

  useEffect(() => {
    if (selectedFamily) {
      setFamilia(selectedFamily);
    }
  }, [selectedFamily]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedFamily]);

  const filteredLines = useMemo(() => {
    if (!familyFilter) {
      return lines;
    }
    if (familyFilter === "Sin familia") {
      return lines.filter((line) => !line.familia);
    }
    return lines.filter((line) => line.familia === familyFilter);
  }, [lines, familyFilter]);

  const filteredArticulos = useMemo(() => {
    if (!selectedFamily) {
      return [];
    }
    return articulos.filter((item) => item.familias?.includes(selectedFamily));
  }, [articulos, selectedFamily]);

  useEffect(() => {
    if (currentIndex >= filteredArticulos.length && filteredArticulos.length > 0) {
      setCurrentIndex(filteredArticulos.length - 1);
    }
  }, [filteredArticulos.length, currentIndex]);

  useEffect(() => {
    if (!pendingScan || !selectedFamily) {
      return;
    }
    const index = filteredArticulos.findIndex(
      (item) =>
        item.codigoBarras === pendingScan ||
        item.alfanumerico === pendingScan
    );
    if (index >= 0) {
      setCurrentIndex(index);
      setPendingScan("");
    }
  }, [pendingScan, selectedFamily, filteredArticulos]);

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
              const matched = articulos.find(
                (item) =>
                  item.codigoBarras === scanned ||
                  item.alfanumerico === scanned
              );
              if (!matched) {
                toast.error("Codigo no encontrado.");
              } else {
                openMatchedItem(matched, "Articulo escaneado");
              }
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
  }, [scannerOpen, selectedFamily, filteredArticulos]);

  const totalItems = useMemo(() => filteredLines.length, [filteredLines]);
  const totalUnidades = useMemo(
    () => filteredLines.reduce((sum, line) => sum + line.real, 0),
    [filteredLines]
  );
  const totalTeorico = useMemo(
    () => filteredLines.reduce((sum, line) => sum + line.teorico, 0),
    [filteredLines]
  );
  const totalDiferencia = useMemo(
    () => filteredLines.reduce((sum, line) => sum + (line.real - line.teorico), 0),
    [filteredLines]
  );
  const totalsByFamily = useMemo(() => {
    const totals = new Map<
      string,
      { teorico: number; real: number; diferencia: number }
    >();
    lines.forEach((line) => {
      const key = line.familia || "Sin familia";
      const current = totals.get(key) ?? { teorico: 0, real: 0, diferencia: 0 };
      const teorico = current.teorico + line.teorico;
      const real = current.real + line.real;
      totals.set(key, {
        teorico,
        real,
        diferencia: real - teorico,
      });
    });
    return Array.from(totals.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [lines]);

  const handleAddLine = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedSku = sku.trim();
    const trimmedNombre = nombre.trim();
    const parsedReal = parseCantidad(cantidad);

    if (!selectedFamily && !familia) {
      toast.error("Selecciona una familia para empezar el conteo.");
      return;
    }

    if (!trimmedSku && !trimmedNombre) {
      toast.error("Agrega un codigo o un nombre.");
      return;
    }

    if (parsedReal === null || parsedReal < 0) {
      toast.error("La cantidad real debe ser valida.");
      return;
    }

    setLines((prev) => {
      const keyBase = trimmedSku
        ? trimmedSku.toLowerCase()
        : trimmedNombre.toLowerCase();
      const key = `${keyBase}__${familia.toLowerCase()}`;
      const existingIndex = prev.findIndex((line) => {
        const lineKeyBase = trimmedSku
          ? line.sku.toLowerCase()
          : line.nombre.toLowerCase();
        const lineKey = `${lineKeyBase}__${(line.familia || "").toLowerCase()}`;
        return lineKey === key;
      });
      if (existingIndex >= 0) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        updated[existingIndex] = {
          ...existing,
          real: existing.real + parsedReal,
          notas: notas.trim() || existing.notas,
        };
        return updated;
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          sku: trimmedSku,
          nombre: trimmedNombre,
          teorico: 0,
          real: parsedReal,
          familia,
          notas: notas.trim(),
        },
      ];
    });

    setSku("");
    setNombre("");
    setCantidad("");
    setFamilia("");
    setNotas("");
  };

  const updateLineFromItem = (
    item: { _id: string; nombre: string; alfanumerico: string; codigoBarras?: string },
    field: "teorico" | "real",
    value: string
  ) => {
    if (!selectedFamily) {
      return;
    }
    const parsed = parseCantidad(value);
    if (parsed === null) {
      return;
    }
    setLines((prev) => {
      const existingIndex = prev.findIndex((line) => line.itemId === item._id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const current = updated[existingIndex];
        const nextLine = {
          ...current,
          [field]: parsed,
          familia: selectedFamily,
        };
        if (nextLine.teorico === 0 && nextLine.real === 0) {
          return prev.filter((line) => line.itemId !== item._id);
        }
        updated[existingIndex] = {
          ...nextLine,
        };
        return updated;
      }
      if (parsed === 0) {
        return prev;
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          itemId: item._id,
          sku: item.alfanumerico,
          nombre: item.nombre,
          codigoBarras: item.codigoBarras,
          teorico: field === "teorico" ? parsed : 0,
          real: field === "real" ? parsed : 0,
          familia: selectedFamily,
          notas: "",
        },
      ];
    });
  };

  const updateLine = (id: string, patch: Partial<CountLine>) => {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const clearAll = () => {
    const ok = window.confirm("Limpiar todo el conteo actual?");
    if (!ok) {
      return;
    }
    setLines([]);
  };

  const downloadCsv = () => {
    if (lines.length === 0) {
      toast.error("No hay lineas para exportar.");
      return;
    }
    const headers = [
      "sku",
      "nombre",
      "codigo_barras",
      "teorico",
      "real",
      "diferencia",
      "familia",
      "notas",
    ];
    const rows = lines.map((line) => [
      csvEscape(line.sku),
      csvEscape(line.nombre),
      csvEscape(line.codigoBarras ?? ""),
      line.teorico.toString(),
      line.real.toString(),
      (line.real - line.teorico).toString(),
      csvEscape(line.familia ?? ""),
      csvEscape(line.notas),
    ]);
    const content = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `conteo-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const currentItem =
    filteredArticulos.length > 0 ? filteredArticulos[currentIndex] : null;

  const openMatchedItem = (
    matched: {
      _id: string;
      nombre: string;
      alfanumerico: string;
      codigoBarras?: string;
      familias: string[];
    },
    messagePrefix: string
  ) => {
    if (selectedFamily && matched.familias?.includes(selectedFamily)) {
      const index = filteredArticulos.findIndex(
        (item) => item._id === matched._id
      );
      if (index >= 0) {
        setCurrentIndex(index);
        toast.success(
          `${messagePrefix}: ${matched.nombre || matched.alfanumerico}.`
        );
        return;
      }
    }

    const nextFamily = matched.familias?.[0] ?? "";
    if (!nextFamily) {
      toast.error("El articulo no tiene familia asignada para el conteo.");
      return;
    }
    setSelectedFamily(nextFamily);
    setPendingScan(matched.codigoBarras ?? matched.alfanumerico);
    toast.success(`${messagePrefix}: ${matched.nombre || matched.alfanumerico}.`);
  };

  const saveCount = async () => {
    if (!selectedFamily) {
      toast.error("Selecciona una familia para guardar.");
      return;
    }

    const expectedIds = filteredArticulos.map((item) => item._id);
    if (expectedIds.length === 0) {
      toast.error("No hay articulos para guardar.");
      return;
    }

    const linesForFamily = lines.filter(
      (line) => line.familia === selectedFamily && line.itemId
    );
    const lineIds = new Set(linesForFamily.map((line) => line.itemId!));
    const missing = expectedIds.filter((id) => !lineIds.has(id));
    if (missing.length > 0) {
      toast.error(
        `El conteo no esta completo. Faltan ${missing.length} articulos.`
      );
      return;
    }

    setSavingCount(true);
    try {
      const response = await fetch("/api/conteos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family: selectedFamily,
          expectedIds,
          lines: linesForFamily.map((line) => ({
            itemId: line.itemId,
            sku: line.sku,
            nombre: line.nombre,
            codigoBarras: line.codigoBarras,
            teorico: line.teorico,
            real: line.real,
          })),
        }),
      });

      const data = (await response.json()) as { message?: string; ok?: boolean };
      if (!response.ok || !data.ok) {
        toast.error(data.message ?? "No se pudo guardar el conteo.");
        return;
      }

      toast.success("Conteo guardado correctamente.");
      setLines((prev) => prev.filter((line) => line.familia !== selectedFamily));
      setSelectedFamily("");
      setCurrentIndex(0);
    } catch (error) {
      toast.error("Error de red al guardar el conteo.");
    } finally {
      setSavingCount(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-zinc-100">
      <div className="pointer-events-none absolute -left-20 top-8 h-80 w-80 rounded-full bg-[#b45309] opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#0f3d36] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.07),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Inventario
            </p>
            <h1 className="text-3xl font-semibold">Conteo de articulos</h1>
            <p className="text-sm text-zinc-400">
              Registra cantidades por producto y exporta el conteo.
            </p>
          </div>
          <a
            className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#b45309]"
            href="/dashboard"
          >
            Volver al dashboard
          </a>
        </header>

        <div className="mt-8 rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.6)]">
          <h2 className="text-xl font-semibold">Resumen</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Lineas
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">
                {totalItems}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Real
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">
                {totalUnidades}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Teorico
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">
                {totalTeorico}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Diferencia
              </p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">
                {totalDiferencia}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Totales por familia
            </p>
            <div className="mt-3 space-y-2 text-sm text-zinc-300">
              {totalsByFamily.length === 0 ? (
                <p className="text-sm text-zinc-400">Sin datos.</p>
              ) : null}
              {totalsByFamily.map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--surface)] px-3 py-2"
                >
                  <span>{key}</span>
                  <span className="font-semibold text-zinc-100">
                    {value.real} / {value.teorico} ({value.diferencia})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              className="w-full rounded-2xl bg-[#0f3d36] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0b2a24]"
              type="button"
              onClick={downloadCsv}
            >
              Descargar CSV
            </button>
            <button
              className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-[#b45309]"
              type="button"
              onClick={clearAll}
              disabled={lines.length === 0}
            >
              Reiniciar conteo
            </button>
            <button
              className="w-full rounded-2xl bg-[#b45309] px-4 py-3 text-sm font-semibold text-white hover:bg-[#92400e] disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              onClick={saveCount}
              disabled={savingCount}
            >
              {savingCount ? "Guardando..." : "Guardar conteo"}
            </button>
          </div>
        </div>

        <section className="mt-8 grid gap-8">
          <div className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6 shadow-[0_20px_50px_-40px_rgba(15,61,54,0.55)]">
              <h2 className="text-xl font-semibold">Familia a contar</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Selecciona la familia para listar los articulos.
              </p>
              <div className="mt-4">
                <select
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#b45309]"
                  value={selectedFamily}
                  onChange={(event) => setSelectedFamily(event.target.value)}
                >
                  <option value="">Selecciona una familia</option>
                  {familias.map((item) => (
                    <option key={item._id} value={item.name}>
                      {item.name} ({item.prefix})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  className="flex-1 rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#b45309]"
                  placeholder="Buscar por codigo o alfanumerico"
                  value={manualLookup}
                  onChange={(event) => setManualLookup(event.target.value)}
                />
                <button
                  className="rounded-2xl border border-white/10 bg-[var(--panel)] px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-[#b45309]"
                  type="button"
                  onClick={() => {
                    const value = manualLookup.trim();
                    if (!value) {
                      toast.error("Ingresa un codigo o alfanumerico.");
                      return;
                    }
                    const matched = articulos.find(
                      (item) =>
                        item.codigoBarras === value ||
                        item.alfanumerico === value
                    );
                    if (!matched) {
                      toast.error("Producto no encontrado.");
                      return;
                    }
                    openMatchedItem(matched, "Producto encontrado");
                    setManualLookup("");
                  }}
                >
                  Buscar
                </button>
              </div>
            </div>

            <form
              className="hidden rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(180,83,9,0.55)]"
              onSubmit={handleAddLine}
              aria-hidden="true"
            >
              <h2 className="text-xl font-semibold">Agregar linea</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Usa codigo o nombre y la cantidad contada.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">Codigo</span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#b45309]"
                    placeholder="Ej. TA1010172"
                    value={sku}
                    onChange={(event) => setSku(event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">Nombre</span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#b45309]"
                    placeholder="Ej. Marlboro Velvet"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Cantidad
                  </span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#b45309]"
                    inputMode="numeric"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={cantidad}
                    onChange={(event) => setCantidad(event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Familia
                  </span>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#b45309]"
                    value={selectedFamily || familia}
                    onChange={(event) => setFamilia(event.target.value)}
                    disabled={Boolean(selectedFamily)}
                  >
                    <option value="">Sin familia</option>
                    {familias.map((item) => (
                      <option key={item._id} value={item.name}>
                        {item.name} ({item.prefix})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-zinc-300">Notas</span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#b45309]"
                    placeholder="Ej. Danado, revisar"
                    value={notas}
                    onChange={(event) => setNotas(event.target.value)}
                  />
                </label>
              </div>

              <button
                className="mt-6 w-full rounded-2xl bg-[#b45309] px-4 py-3 text-sm font-semibold text-white hover:bg-[#92400e]"
                type="submit"
              >
                Agregar al conteo
              </button>
            </form>

            <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(180,83,9,0.35)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Conteo por articulo</h2>
                  <p className="text-sm text-zinc-400">
                    {selectedFamily
                      ? "Captura teorico y real, avanza con siguiente."
                      : "Selecciona una familia para comenzar."}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {!selectedFamily ? (
                  <p className="text-sm text-zinc-400">
                    Debes elegir una familia para empezar.
                  </p>
                ) : loadingArticulos ? (
                  <p className="text-sm text-zinc-400">Cargando articulos...</p>
                ) : filteredArticulos.length === 0 ? (
                  <p className="text-sm text-zinc-400">
                    No hay articulos para esta familia.
                  </p>
                ) : (
                  currentItem ? (
                    (() => {
                      const existing = lines.find(
                        (line) => line.itemId === currentItem._id
                      );
                      return (
                        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-lg font-semibold text-zinc-100">
                                {currentItem.nombre || currentItem.alfanumerico}
                              </p>
                              <p className="text-xs text-zinc-400">
                                {currentItem.alfanumerico}
                                {currentItem.codigoBarras
                                  ? ` - ${currentItem.codigoBarras}`
                                  : " - sin codigo de barras"}
                              </p>
                              <p className="mt-2 text-xs text-zinc-500">
                                {currentIndex + 1} de {filteredArticulos.length}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col gap-2">
                                <input
                                  className="w-32 rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#b45309]"
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={existing?.teorico ?? ""}
                                  onChange={(event) =>
                                    updateLineFromItem(
                                      currentItem,
                                      "teorico",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Teorico"
                                />
                                <input
                                  className="w-32 rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#b45309]"
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={existing?.real ?? ""}
                                  onChange={(event) =>
                                    updateLineFromItem(
                                      currentItem,
                                      "real",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Real"
                                />
                              </div>
                              <div className="rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-200">
                                Dif: {(existing?.real ?? 0) - (existing?.teorico ?? 0)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                            <button
                              className="rounded-full border border-white/10 bg-[var(--panel)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#b45309]"
                              type="button"
                              onClick={() =>
                                setCurrentIndex((prev) => Math.max(0, prev - 1))
                              }
                              disabled={currentIndex === 0}
                            >
                              Anterior
                            </button>
                            <button
                              className="rounded-full border border-white/10 bg-[var(--panel)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#b45309]"
                              type="button"
                              onClick={() => setScannerOpen(true)}
                            >
                              Escanear
                            </button>
                            <button
                              className="rounded-full bg-[#b45309] px-6 py-2 text-xs font-semibold text-white hover:bg-[#92400e]"
                              type="button"
                              onClick={() =>
                                setCurrentIndex((prev) =>
                                  Math.min(filteredArticulos.length - 1, prev + 1)
                                )
                              }
                              disabled={currentIndex >= filteredArticulos.length - 1}
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : null
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.55)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Lineas del conteo</h2>
                  <p className="text-sm text-zinc-400">
                    {lines.length === 0
                      ? "Aun no hay lineas cargadas."
                      : "Edita cantidades o elimina productos."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-full border border-white/10 bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-zinc-100"
                    value={familyFilter}
                    onChange={(event) => setFamilyFilter(event.target.value)}
                  >
                    <option value="">Todas las familias</option>
                    {familias.map((item) => (
                      <option key={item._id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                    <option value="Sin familia">Sin familia</option>
                  </select>
                  <button
                    className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-100 hover:border-[#0f3d36]"
                    type="button"
                    onClick={clearAll}
                    disabled={lines.length === 0}
                  >
                    Limpiar todo
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {filteredLines.length === 0 ? (
                  <p className="text-sm text-zinc-400">
                    Empieza agregando un articulo.
                  </p>
                ) : null}

                {filteredLines.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">
                          {line.nombre || line.sku}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {line.sku ? `Codigo: ${line.sku}` : "Sin codigo"}
                          {line.familia ? ` - ${line.familia}` : ""}
                        </p>
                      </div>
                      <button
                        className="rounded-full border border-white/10 bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-red-400 hover:border-red-400"
                        type="button"
                        onClick={() => removeLine(line.id)}
                      >
                        Eliminar
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[140px_140px_140px_140px_1fr]">
                      <label className="space-y-1 text-xs text-zinc-400">
                        Teorico
                        <input
                          className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                          type="number"
                          min="0"
                          step="1"
                          value={line.teorico}
                          onChange={(event) => {
                            const parsed = parseCantidad(event.target.value);
                            if (parsed === null) {
                              return;
                            }
                            updateLine(line.id, { teorico: parsed });
                          }}
                        />
                      </label>
                      <label className="space-y-1 text-xs text-zinc-400">
                        Real
                        <input
                          className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                          type="number"
                          min="0"
                          step="1"
                          value={line.real}
                          onChange={(event) => {
                            const parsed = parseCantidad(event.target.value);
                            if (parsed === null) {
                              return;
                            }
                            updateLine(line.id, { real: parsed });
                          }}
                        />
                      </label>
                      <label className="space-y-1 text-xs text-zinc-400">
                        Diferencia
                        <div className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100">
                          {line.real - line.teorico}
                        </div>
                      </label>
                      <label className="space-y-1 text-xs text-zinc-400">
                        Familia
                        <select
                          className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                          value={line.familia}
                          onChange={(event) =>
                            updateLine(line.id, { familia: event.target.value })
                          }
                        >
                          <option value="">Sin familia</option>
                          {familias.map((item) => (
                            <option key={item._id} value={item.name}>
                              {item.name} ({item.prefix})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-xs text-zinc-400">
                        Notas
                        <input
                          className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                          value={line.notas}
                          onChange={(event) =>
                            updateLine(line.id, { notas: event.target.value })
                          }
                          placeholder="Detalles del conteo"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6 text-sm text-zinc-400">
            <p className="font-semibold text-zinc-200">Tips rapidos</p>
            <ul className="mt-3 space-y-2">
              <li>Las lineas se guardan en el navegador como borrador.</li>
              <li>Usa Siguiente para avanzar al proximo articulo.</li>
              <li>Exporta el CSV para compartir el conteo.</li>
            </ul>
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


