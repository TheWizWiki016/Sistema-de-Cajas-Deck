"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Familia = {
  _id: string;
  prefix: string;
  name: string;
  createdAt: string;
};

export default function FamiliasPage() {
  const [prefix, setPrefix] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [familias, setFamilias] = useState<Familia[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrefix, setEditPrefix] = useState("");
  const [editName, setEditName] = useState("");

  const totalFamilias = useMemo(() => familias.length, [familias]);

  const loadFamilias = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/familias");
      const data = (await response.json()) as { familias?: Familia[]; message?: string };
      if (response.ok) {
        setFamilias(data.familias ?? []);
      } else {
        toast.error(data.message ?? "No se pudieron cargar las familias.");
      }
    } catch (error) {
      toast.error("Error de red al cargar las familias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilias();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!prefix.trim()) {
      toast.error("El prefijo es obligatorio.");
      return;
    }

    if (!name.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/familias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: prefix.trim(),
          name: name.trim(),
        }),
      });

      const data = (await response.json()) as { familia?: Familia; message?: string };
      if (!response.ok || !data.familia) {
        toast.error(data.message ?? "No se pudo guardar la familia.");
        return;
      }

      setFamilias((prev) => [data.familia!, ...prev]);
      setPrefix("");
      setName("");
      toast.success("Familia guardada correctamente.");
    } catch (error) {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (familia: Familia) => {
    setEditingId(familia._id);
    setEditPrefix(familia.prefix);
    setEditName(familia.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPrefix("");
    setEditName("");
  };

  const saveEdit = async () => {
    if (!editingId) {
      return;
    }

    if (!editPrefix.trim() || !editName.trim()) {
      toast.error("Completa prefijo y nombre.");
      return;
    }

    const response = await fetch(`/api/familias/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix: editPrefix.trim(),
        name: editName.trim(),
      }),
    });

    const data = (await response.json()) as { familia?: Familia; message?: string };
    if (!response.ok || !data.familia) {
      toast.error(data.message ?? "No se pudo actualizar la familia.");
      return;
    }

    setFamilias((prev) =>
      prev.map((item) => (item._id === data.familia!._id ? data.familia! : item))
    );
    toast.success("Familia actualizada.");
    cancelEdit();
  };

  const deleteFamilia = async (familia: Familia) => {
    const ok = window.confirm(`Eliminar la familia "${familia.name}"?`);
    if (!ok) {
      return;
    }

    const response = await fetch(`/api/familias/${familia._id}`, {
      method: "DELETE",
    });

    const data = (await response.json()) as { message?: string };
    if (!response.ok) {
      toast.error(data.message ?? "No se pudo eliminar la familia.");
      return;
    }

    setFamilias((prev) => prev.filter((item) => item._id !== familia._id));
    toast.success("Familia eliminada.");
  };

  const recalculateFamilias = async () => {
    const ok = window.confirm(
      "Recalcular familias para todos los articulos existentes?"
    );
    if (!ok) {
      return;
    }
    setRecalculating(true);
    try {
      const response = await fetch("/api/familias/recalculate", {
        method: "POST",
      });
      const data = (await response.json()) as {
        updatedCount?: number;
        message?: string;
      };
      if (!response.ok) {
        toast.error(data.message ?? "No se pudo recalcular.");
        return;
      }
      toast.success(
        `Familias recalculadas. Articulos actualizados: ${data.updatedCount ?? 0}.`
      );
    } catch (error) {
      toast.error("Error de red al recalcular.");
    } finally {
      setRecalculating(false);
    }
  };

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
            <h1 className="text-3xl font-semibold">Familias de productos</h1>
            <p className="text-sm text-zinc-400">
              {totalFamilias} familias registradas.
            </p>
          </div>
          <a
            className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#7c1127]"
            href="/dashboard"
          >
            Volver al dashboard
          </a>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <form
            className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(124,17,39,0.55)]"
            onSubmit={handleCreate}
          >
            <h2 className="text-xl font-semibold">Nueva familia</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Define el prefijo que identifica al alfanumerico.
            </p>

            <div className="mt-6 space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-300">Prefijo</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                  placeholder="Ej. TA"
                  value={prefix}
                  onChange={(event) => setPrefix(event.target.value.toUpperCase())}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-300">Nombre</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                  placeholder="Ej. Tabaco"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            </div>

            <button
              className="mt-6 w-full rounded-2xl bg-[#7c1127] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 hover:bg-[#5c0b1c]"
              type="submit"
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar familia"}
            </button>
          </form>

          <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.6)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Familias registradas</h2>
                <p className="text-sm text-zinc-400">
                  Administra los prefijos disponibles.
                </p>
              </div>
              <button
                className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#0f3d36]"
                type="button"
                onClick={loadFamilias}
              >
                Actualizar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-sm text-zinc-400">Cargando familias...</p>
              ) : null}
              {!loading && familias.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  Aun no hay familias registradas.
                </p>
              ) : null}

              {familias.map((familia) => (
                <div
                  key={familia._id}
                  className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4"
                >
                  {editingId === familia._id ? (
                    <div className="space-y-3">
                      <input
                        className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100"
                        value={editPrefix}
                        onChange={(event) =>
                          setEditPrefix(event.target.value.toUpperCase())
                        }
                        placeholder="Prefijo"
                      />
                      <input
                        className="w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        placeholder="Nombre"
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
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">
                            {familia.name}
                          </p>
                          <p className="text-xs text-zinc-400">
                            Prefijo: {familia.prefix}
                          </p>
                        </div>
                        <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs text-zinc-400">
                          {familia.prefix}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="rounded-full border border-white/10 bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-[#7c1127]"
                          type="button"
                          onClick={() => startEdit(familia)}
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-full border border-white/10 bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-red-400 hover:border-red-400"
                          type="button"
                          onClick={() => deleteFamilia(familia)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-[var(--surface-70)] p-4">
              <h3 className="text-sm font-semibold text-zinc-100">
                Recalcular familias
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                Aplica los prefijos actuales a todos los articulos guardados.
              </p>
              <button
                className="mt-3 w-full rounded-2xl border border-white/10 bg-[var(--panel)] px-4 py-2 text-xs font-semibold text-zinc-100 disabled:cursor-not-allowed disabled:opacity-70 hover:border-[#0f3d36]"
                type="button"
                onClick={recalculateFamilias}
                disabled={recalculating}
              >
                {recalculating ? "Recalculando..." : "Recalcular ahora"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


