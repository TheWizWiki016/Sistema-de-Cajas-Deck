"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_THEME_ID, THEME_PRESETS } from "@/lib/themes";
import { ANIMATION_PRESETS, DEFAULT_ANIMATION_ID } from "@/lib/animations";

type Tool = {
  _id: string;
  key: string;
  label: string;
  description?: string;
  visibleToUser: boolean;
};

type SettingsResponse = {
  themeId?: string;
  animationStyle?: string;
  dashboard?: {
    columns?: number;
    order?: string[];
    adminOrder?: string[];
  };
};

type RoleResponse = {
  role: "admin" | "usuario" | null;
};

const toRgba = (hex: string, alpha: number) => {
  const cleaned = hex.replace("#", "");
  const parsed =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((value) => value + value)
          .join("")
      : cleaned;
  const r = parseInt(parsed.slice(0, 2), 16);
  const g = parseInt(parsed.slice(2, 4), 16);
  const b = parseInt(parsed.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const applyTheme = (themeId: string) => {
  const theme =
    THEME_PRESETS.find((preset) => preset.id === themeId) ??
    THEME_PRESETS.find((preset) => preset.id === DEFAULT_THEME_ID);
  if (!theme) {
    return;
  }
  const root = document.documentElement;
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--panel", theme.panel);
  root.style.setProperty("--panel-90", toRgba(theme.panel, 0.9));
  root.style.setProperty("--panel-80", toRgba(theme.panel, 0.8));
  root.style.setProperty("--surface", theme.surface);
  root.style.setProperty("--surface-70", toRgba(theme.surface, 0.7));
};

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()?.split(";").shift() ?? "");
  }
  return "";
}

export default function PersonalizacionPage() {
  const [role, setRole] = useState<"admin" | "usuario" | "desconocido">(
    "desconocido"
  );
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [animationStyle, setAnimationStyle] = useState(DEFAULT_ANIMATION_ID);
  const [columns, setColumns] = useState(3);
  const [order, setOrder] = useState<string[]>([]);
  const [adminOrder, setAdminOrder] = useState<string[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);

  useEffect(() => {
    const username = getCookie("deck_user");
    if (!username) {
      setRole("desconocido");
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    Promise.all([
      fetch(`/api/users/role?username=${encodeURIComponent(username)}`),
      fetch("/api/tools"),
      fetch("/api/settings"),
    ])
      .then(async ([roleRes, toolsRes, settingsRes]) => {
        const roleData = (await roleRes.json()) as RoleResponse;
        const toolsData = (await toolsRes.json()) as { tools?: Tool[] };
        const settingsData = (await settingsRes.json()) as SettingsResponse;
        if (!alive) {
          return;
        }
        setRole(roleData.role ?? "desconocido");
        setTools(toolsData.tools ?? []);
        setThemeId(settingsData.themeId ?? DEFAULT_THEME_ID);
        setAnimationStyle(settingsData.animationStyle ?? DEFAULT_ANIMATION_ID);
        setColumns(settingsData.dashboard?.columns ?? 3);
        setOrder(settingsData.dashboard?.order ?? []);
        setAdminOrder(settingsData.dashboard?.adminOrder ?? []);
      })
      .catch(() => {
        if (!alive) {
          return;
        }
        toast.error("No se pudo cargar la personalizacion.");
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  const orderedTools = useMemo(() => {
    const map = new Map(order.map((key, index) => [key, index]));
    return [...tools].sort((a, b) => {
      const aIndex = map.get(a.key);
      const bIndex = map.get(b.key);
      if (aIndex === undefined && bIndex === undefined) {
        return a.label.localeCompare(b.label);
      }
      if (aIndex === undefined) {
        return 1;
      }
      if (bIndex === undefined) {
        return -1;
      }
      return aIndex - bIndex;
    });
  }, [tools, order]);

  const moveTool = (key: string, direction: "up" | "down") => {
    setOrder((prev) => {
      const base = prev.length ? [...prev] : orderedTools.map((tool) => tool.key);
      const index = base.indexOf(key);
      if (index < 0) {
        return base;
      }
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= base.length) {
        return base;
      }
      const updated = [...base];
      const [item] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, item);
      return updated;
    });
  };

  const handleDrop = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) {
      return;
    }
    setOrder((prev) => {
      const base = prev.length ? [...prev] : orderedTools.map((tool) => tool.key);
      const fromIndex = base.indexOf(dragKey);
      const toIndex = base.indexOf(targetKey);
      if (fromIndex < 0 || toIndex < 0) {
        return base;
      }
      const updated = [...base];
      const [item] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, item);
      return updated;
    });
  };

  const saveSettings = async () => {
    if (role !== "admin") {
      toast.error("No autorizado.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId,
          animationStyle,
          dashboard: {
            columns,
            order,
            adminOrder,
          },
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        toast.error(data.message ?? "No se pudo guardar la configuracion.");
        return;
      }
      applyTheme(themeId);
      toast.success("Configuracion guardada.");
    } catch (error) {
      toast.error("Error de red al guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent text-zinc-100">
        <p className="text-sm text-zinc-400">Cargando personalizacion...</p>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6 text-zinc-100">
        <div className="max-w-md rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-100">
            Acceso restringido
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Solo un administrador puede editar la personalizacion.
          </p>
          <a
            className="mt-6 inline-flex rounded-full bg-[#7c1127] px-4 py-2 text-sm font-semibold text-white"
            href="/dashboard"
          >
            Volver al dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-zinc-100">
      <div className="pointer-events-none absolute -left-24 top-12 h-80 w-80 rounded-full bg-[#7c1127] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#0f3d36] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.07),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Configuracion
            </p>
            <h1 className="text-3xl font-semibold">Personalizacion</h1>
            <p className="text-sm text-zinc-400">
              Cambia tema y distribucion del dashboard.
            </p>
          </div>
          <a
            className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#7c1127]"
            href="/dashboard"
          >
            Volver al dashboard
          </a>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(124,17,39,0.55)]">
            <h2 className="text-xl font-semibold">Tema global</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Fondo y paneles para todo el sistema.
            </p>

            <div className="mt-6 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Animacion de fondo
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                {ANIMATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    className={`rounded-2xl border p-4 text-left transition ${
                      animationStyle === preset.id
                        ? "border-[#0f3d36] bg-[var(--surface)]"
                        : "border-white/10 bg-[var(--surface)] hover:border-[#7c1127]"
                    }`}
                    type="button"
                    onClick={() => setAnimationStyle(preset.id)}
                  >
                    <div className="anim-preview" data-anim={preset.id} />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-zinc-100">
                        {preset.name}
                      </span>
                      {animationStyle === preset.id ? (
                        <span className="rounded-full border border-[#0f3d36] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c8f4e8]">
                          Activo
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {THEME_PRESETS.map((theme) => (
                <button
                  key={theme.id}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    themeId === theme.id
                      ? "border-[#7c1127] bg-[var(--surface)]"
                      : "border-white/10 bg-[var(--surface)] hover:border-[#0f3d36]"
                  }`}
                  type="button"
                  onClick={() => setThemeId(theme.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-zinc-100">
                      {theme.name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                      {themeId === theme.id ? "Activo" : "Vista previa"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-zinc-300">
                    <div className="flex flex-col gap-1">
                      <div
                        className="h-6 rounded-lg border border-white/5"
                        style={{ background: theme.background }}
                      />
                      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Fondo
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div
                        className="h-6 rounded-lg border border-white/5"
                        style={{ background: theme.panel }}
                      />
                      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Panel
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div
                        className="h-6 rounded-lg border border-white/5"
                        style={{ background: theme.surface }}
                      />
                      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Superficie
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.6)]">
              <h2 className="text-xl font-semibold">Distribucion de iconos</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Orden y columnas del dashboard.
              </p>

              <div className="mt-6 space-y-4">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Columnas
                </label>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                  value={columns}
                  onChange={(event) => setColumns(Number(event.target.value))}
                >
                  <option value={1}>1 columna</option>
                  <option value={2}>2 columnas</option>
                  <option value={3}>3 columnas</option>
                  <option value={4}>4 columnas</option>
                </select>
              </div>

              <div className="mt-6 space-y-3">
                {orderedTools.map((tool, index) => (
                  <div
                    key={tool._id}
                    className={`flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 ${
                      dragKey === tool.key ? "opacity-60" : ""
                    }`}
                    draggable
                    onDragStart={() => setDragKey(tool.key)}
                    onDragEnd={() => setDragKey(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(tool.key)}
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {tool.label}
                      </p>
                      <p className="text-xs text-zinc-400">{tool.key}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-full border border-white/10 bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-zinc-200"
                        type="button"
                        onClick={() => moveTool(tool.key, "up")}
                        disabled={index === 0}
                      >
                        Subir
                      </button>
                      <button
                        className="rounded-full border border-white/10 bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-zinc-200"
                        type="button"
                        onClick={() => moveTool(tool.key, "down")}
                        disabled={index === orderedTools.length - 1}
                      >
                        Bajar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="w-full rounded-2xl bg-[#7c1127] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 hover:bg-[#5c0b1c]"
              type="button"
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
