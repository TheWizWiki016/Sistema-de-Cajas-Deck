"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Articulo = {
  _id: string;
  nombre: string;
  familias: string[];
  alfanumerico: string;
  codigoBarras?: string;
  upc?: string;
  cantidadPorCaja?: number | null;
  precio: number | null;
  createdAt: string;
};

type Familia = {
  _id: string;
  prefix: string;
  name: string;
};

type ArticulosResponse = {
  articulos: Articulo[];
  message?: string;
};

export default function ArticulosPage() {
  const [nombre, setNombre] = useState("");
  const [alfanumerico, setAlfanumerico] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [upc, setUpc] = useState("");
  const [cantidadPorCaja, setCantidadPorCaja] = useState("");
  const [precio, setPrecio] = useState("");
  const [familia, setFamilia] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [loading, setLoading] = useState(true);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editAlfanumerico, setEditAlfanumerico] = useState("");
  const [editCodigoBarras, setEditCodigoBarras] = useState("");
  const [editUpc, setEditUpc] = useState("");
  const [editCantidadPorCaja, setEditCantidadPorCaja] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editFamilia, setEditFamilia] = useState("");

  const totalArticulos = useMemo(() => articulos.length, [articulos]);

  const loadArticulos = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/articulos");
      const data = (await response.json()) as ArticulosResponse;
      if (response.ok) {
        setArticulos(data.articulos ?? []);
      } else {
        toast.error(data.message ?? "No se pudieron cargar los articulos.");
      }
    } catch (error) {
      toast.error("Error de red al cargar los articulos.");
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    loadArticulos();
    loadFamilias();
  }, []);

  const isCerveza = (code: string, selectedFamily: string) => {
    const normalized = code.trim().toUpperCase();
    if (normalized.startsWith("CE")) {
      return true;
    }
    return selectedFamily.trim().toLowerCase() === "cerveza";
  };

  const resetForm = () => {
    setNombre("");
    setAlfanumerico("");
    setCodigoBarras("");
    setUpc("");
    setCantidadPorCaja("");
    setPrecio("");
    setFamilia("");
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!alfanumerico.trim()) {
      toast.error("El codigo alfanumerico es obligatorio.");
      return;
    }

    if (!precio.trim()) {
      toast.error("El precio es obligatorio.");
      return;
    }

    const cerveza = isCerveza(alfanumerico, familia);
    const cajaValue =
      cantidadPorCaja.trim() === "" ? null : Number(cantidadPorCaja);
    if (cerveza && cajaValue !== null && Number.isNaN(cajaValue)) {
      toast.error("La cantidad por caja debe ser un numero valido.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nombre,
        alfanumerico,
        codigoBarras,
        precio: Number(precio),
        familias: familia ? [familia] : [],
      };
      if (cerveza) {
        payload.upc = upc;
        payload.cantidadPorCaja = cajaValue;
      }

      const response = await fetch("/api/articulos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        articulo?: Articulo;
        message?: string;
      };

      if (!response.ok || !data.articulo) {
        toast.error(data.message ?? "No se pudo guardar el articulo.");
        return;
      }

      setArticulos((prev) => [data.articulo!, ...prev]);
      resetForm();
      toast.success("Articulo guardado correctamente.");
    } catch (error) {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAdd = async () => {
    const raw = bulkJson.trim();
    if (!raw) {
      toast.error("Pega un JSON valido para la carga masiva.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      toast.error("El JSON no es valido.");
      return;
    }

    if (!Array.isArray(parsed)) {
      toast.error("El JSON debe ser un arreglo de articulos.");
      return;
    }

    setBulkSaving(true);
    try {
      const response = await fetch("/api/articulos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsed }),
      });
      const data = (await response.json()) as { insertedCount?: number; message?: string };
      if (!response.ok) {
        toast.error(data.message ?? "No se pudo cargar el JSON.");
        return;
      }
      toast.success(
        `Carga masiva completada. Insertados: ${data.insertedCount ?? 0}.`
      );
      setBulkJson("");
      loadArticulos();
    } catch (error) {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setBulkSaving(false);
    }
  };

  const startEdit = (articulo: Articulo) => {
    setEditingId(articulo._id);
    setEditNombre(articulo.nombre ?? "");
    setEditAlfanumerico(articulo.alfanumerico ?? "");
    setEditCodigoBarras(articulo.codigoBarras ?? "");
    setEditUpc(articulo.upc ?? "");
    setEditCantidadPorCaja(
      articulo.cantidadPorCaja === null || articulo.cantidadPorCaja === undefined
        ? ""
        : articulo.cantidadPorCaja.toString()
    );
    setEditPrecio(
      articulo.precio === null || articulo.precio === undefined
        ? ""
        : articulo.precio.toString()
    );
    setEditFamilia((articulo.familias ?? [])[0] ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNombre("");
    setEditAlfanumerico("");
    setEditCodigoBarras("");
    setEditUpc("");
    setEditCantidadPorCaja("");
    setEditPrecio("");
    setEditFamilia("");
  };

  const saveEdit = async () => {
    if (!editingId) {
      return;
    }

    if (!editAlfanumerico.trim()) {
      toast.error("El codigo alfanumerico es obligatorio.");
      return;
    }

    const cerveza = isCerveza(editAlfanumerico, editFamilia);
    const cajaValue =
      editCantidadPorCaja.trim() === "" ? null : Number(editCantidadPorCaja);
    if (cerveza && cajaValue !== null && Number.isNaN(cajaValue)) {
      toast.error("La cantidad por caja debe ser un numero valido.");
      return;
    }

    const payload: Record<string, unknown> = {
      nombre: editNombre,
      alfanumerico: editAlfanumerico,
      codigoBarras: editCodigoBarras,
      precio: editPrecio.trim() === "" ? null : Number(editPrecio),
      familias: editFamilia ? [editFamilia] : [],
    };
    if (cerveza) {
      payload.upc = editUpc;
      payload.cantidadPorCaja = cajaValue;
    }

    const response = await fetch(`/api/articulos/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { articulo?: Articulo; message?: string };
    if (!response.ok || !data.articulo) {
      toast.error(data.message ?? "No se pudo actualizar el articulo.");
      return;
    }

    setArticulos((prev) =>
      prev.map((item) => (item._id === data.articulo!._id ? data.articulo! : item))
    );
    toast.success("Articulo actualizado.");
    cancelEdit();
  };

  const deleteArticulo = async (articulo: Articulo) => {
    const ok = window.confirm(
      `Eliminar el articulo "${articulo.alfanumerico}"?`
    );
    if (!ok) {
      return;
    }

    const response = await fetch(`/api/articulos/${articulo._id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("No se pudo eliminar el articulo.");
      return;
    }

    setArticulos((prev) => prev.filter((item) => item._id !== articulo._id));
    toast.success("Articulo eliminado.");
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
              Inventario
            </p>
            <h1 className="text-3xl font-semibold">Gestion de articulos</h1>
            <p className="text-sm text-zinc-400">
              {totalArticulos} articulos registrados.
            </p>
          </div>
          <a
            className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#7c1127]"
            href="/dashboard"
          >
            Volver al dashboard
          </a>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <form
            className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(124,17,39,0.55)]"
            onSubmit={handleCreate}
          >
            <h2 className="text-xl font-semibold">Nuevo articulo</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Completa los datos para agregar un articulo al catalogo.
            </p>

            <div className="mt-6 space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-300">Nombre</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                  placeholder="Ej. Marlboro Velvet"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-300">
                  Codigo alfanumerico
                </span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                  placeholder="Ej. A-1024"
                  value={alfanumerico}
                  onChange={(event) => setAlfanumerico(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-300">Familia</span>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                  value={familia}
                  onChange={(event) => setFamilia(event.target.value)}
                >
                  <option value="">Selecciona una familia</option>
                  {familias.map((item) => (
                    <option key={item._id} value={item.name}>
                      {item.name} ({item.prefix})
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-300">
                  Codigo de barras
                </span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                  placeholder="Ej. 7501234567890"
                  value={codigoBarras}
                  onChange={(event) => setCodigoBarras(event.target.value)}
                />
              </label>
              {isCerveza(alfanumerico, familia) ? (
                <>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-zinc-300">UPC</span>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                      placeholder="Ej. 75026967"
                      value={upc}
                      onChange={(event) => setUpc(event.target.value)}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-zinc-300">
                      Cantidad por caja
                    </span>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      value={cantidadPorCaja}
                      onChange={(event) => setCantidadPorCaja(event.target.value)}
                    />
                  </label>
                </>
              ) : null}
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-300">Precio</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={precio}
                  onChange={(event) => setPrecio(event.target.value)}
                />
              </label>
            </div>

            <button
              className="mt-6 w-full rounded-2xl bg-[#7c1127] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 hover:bg-[#5c0b1c]"
              type="submit"
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar articulo"}
            </button>

            <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-[var(--surface-70)] p-4">
              <h3 className="text-sm font-semibold text-zinc-100">
                Carga masiva (JSON)
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                Pega un arreglo JSON con objetos que incluyan nombre,
                alfanumerico y codigo_barras o codigoBarras. Para cerveza (CE)
                tambien puedes incluir upc y cantidadPorCaja. La familia se
                deriva del alfanumerico.
              </p>
              <textarea
                className="mt-3 min-h-[140px] w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[#7c1127]"
                placeholder='[{"nombre":"Marlboro Velvet","alfanumerico":"TA1010172","codigo_barras":"75068765","precio":12.5},{"nombre":"Cerveza Victoria Botella 210 ml","alfanumerico":"CE1010001","upc":"75026967","cantidadPorCaja":24}]'
                value={bulkJson}
                onChange={(event) => setBulkJson(event.target.value)}
              />
              <button
                className="mt-3 w-full rounded-2xl border border-white/10 bg-[var(--panel)] px-4 py-2 text-xs font-semibold text-zinc-100 disabled:cursor-not-allowed disabled:opacity-70 hover:border-[#0f3d36]"
                type="button"
                onClick={handleBulkAdd}
                disabled={bulkSaving}
              >
                {bulkSaving ? "Cargando..." : "Cargar JSON"}
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.6)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Catalogo</h2>
                <p className="text-sm text-zinc-400">
                  Edita, elimina o revisa articulos existentes.
                </p>
              </div>
              <button
                className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#0f3d36]"
                type="button"
                onClick={loadArticulos}
              >
                Actualizar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-sm text-zinc-400">Cargando articulos...</p>
              ) : null}
              {!loading && articulos.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  Aun no hay articulos registrados.
                </p>
              ) : null}

              {articulos.map((articulo) => (
                <div
                  key={articulo._id}
                  className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4"
                >
                  {editingId === articulo._id ? (
                    <div className="space-y-3">
                      <input
                        className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100"
                        value={editNombre}
                        onChange={(event) => setEditNombre(event.target.value)}
                        placeholder="Nombre"
                      />
                      <input
                        className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100"
                        value={editAlfanumerico}
                        onChange={(event) => setEditAlfanumerico(event.target.value)}
                        placeholder="Codigo alfanumerico"
                      />
                      <input
                        className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100"
                        value={editCodigoBarras}
                        onChange={(event) => setEditCodigoBarras(event.target.value)}
                        placeholder="Codigo de barras"
                      />
                      {isCerveza(editAlfanumerico, editFamilia) ? (
                        <>
                          <input
                            className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100"
                            value={editUpc}
                            onChange={(event) => setEditUpc(event.target.value)}
                            placeholder="UPC"
                          />
                          <input
                            className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100"
                            type="number"
                            step="1"
                            min="0"
                            value={editCantidadPorCaja}
                            onChange={(event) =>
                              setEditCantidadPorCaja(event.target.value)
                            }
                            placeholder="Cantidad por caja"
                          />
                        </>
                      ) : null}
                      <select
                        className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100"
                        value={editFamilia}
                        onChange={(event) => setEditFamilia(event.target.value)}
                      >
                        <option value="">Selecciona una familia</option>
                        {familias.map((item) => (
                          <option key={item._id} value={item.name}>
                            {item.name} ({item.prefix})
                          </option>
                        ))}
                      </select>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100"
                        type="number"
                        step="0.01"
                        value={editPrecio}
                        onChange={(event) => setEditPrecio(event.target.value)}
                        placeholder="Precio"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full bg-[#7c1127] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5c0b1c]"
                          type="button"
                          onClick={saveEdit}
                        >
                          Guardar
                        </button>
                        <button
                          className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-200"
                          type="button"
                          onClick={cancelEdit}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">
                            {articulo.nombre || articulo.alfanumerico}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {articulo.nombre ? articulo.alfanumerico : null}
                            {articulo.nombre ? " · " : ""}
                            {articulo.codigoBarras
                              ? `Codigo de barras: ${articulo.codigoBarras}`
                              : "Sin codigo de barras"}
                            {articulo.upc ? " Жњ " : ""}
                            {articulo.upc ? `UPC: ${articulo.upc}` : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs text-zinc-400">
                          {articulo.precio === null
                            ? "Sin precio"
                            : `$${articulo.precio.toFixed(2)}`}
                        </span>
                      </div>
                      {articulo.cantidadPorCaja !== null &&
                      articulo.cantidadPorCaja !== undefined ? (
                        <p className="text-xs text-zinc-400">
                          Cantidad por caja: {articulo.cantidadPorCaja}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {(articulo.familias ?? []).length === 0 ? (
                          <span className="text-xs text-zinc-500">
                            Sin familias asignadas
                          </span>
                        ) : (
                          articulo.familias.map((familia) => (
                            <span
                              key={familia}
                              className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs text-zinc-400"
                            >
                              {familia}
                            </span>
                          ))
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="rounded-full border border-white/10 bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-[#7c1127]"
                          type="button"
                          onClick={() => startEdit(articulo)}
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-full border border-white/10 bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-red-400 hover:border-red-400"
                          type="button"
                          onClick={() => deleteArticulo(articulo)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


