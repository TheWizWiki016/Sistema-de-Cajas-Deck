"use client";

import { useEffect, useMemo, useState } from "react";

type Tool = {
  _id: string;
  key: string;
  label: string;
  description?: string;
  visibleToUser: boolean;
};

type RoleResponse = {
  role: "admin" | "usuario" | null;
};

type ToolsResponse = {
  tools: Tool[];
};

const TOOL_ROUTES: Record<string, string> = {
  "imprimir-precios": "/tools/imprimir-precios",
  conteos: "/tools/conteos",
  cortes: "/tools/cortes",
};

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()?.split(";").shift() ?? "");
  }
  return "";
}

export default function DashboardPage() {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"admin" | "usuario" | "desconocido">(
    "desconocido"
  );
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisible, setEditVisible] = useState(true);

  useEffect(() => {
    const storedUser = getCookie("deck_user");
    setUsername(storedUser);
  }, []);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    Promise.all([
      fetch(`/api/users/role?username=${encodeURIComponent(username)}`),
      fetch("/api/tools"),
    ])
      .then(async ([roleRes, toolsRes]) => {
        const roleData = (await roleRes.json()) as RoleResponse;
        const toolsData = (await toolsRes.json()) as ToolsResponse;
        if (!alive) {
          return;
        }
        if (!roleRes.ok || !roleData.role) {
          setRole("desconocido");
        } else {
          setRole(roleData.role);
        }
        setTools(toolsData.tools ?? []);
        setMessage("");
      })
      .catch(() => {
        if (!alive) {
          return;
        }
        setMessage("No se pudieron cargar las herramientas.");
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [username]);

  const visibleTools = useMemo(
    () => tools.filter((tool) => tool.visibleToUser),
    [tools]
  );

  const handleCreateTool = async () => {
    setMessage("");
    if (!newLabel.trim()) {
      setMessage("Agrega un nombre para la herramienta.");
      return;
    }

    const response = await fetch("/api/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newLabel.trim(),
        description: newDescription.trim(),
      }),
    });

    const data = (await response.json()) as { tool?: Tool; message?: string };
    if (!response.ok || !data.tool) {
      setMessage(data.message ?? "No se pudo crear la herramienta.");
      return;
    }

    setTools((prev) => [...prev, data.tool!]);
    setNewLabel("");
    setNewDescription("");
  };

  const startEdit = (tool: Tool) => {
    setEditingId(tool._id);
    setEditLabel(tool.label);
    setEditDescription(tool.description ?? "");
    setEditVisible(tool.visibleToUser);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
    setEditDescription("");
    setEditVisible(true);
  };

  const saveEdit = async () => {
    if (!editingId) {
      return;
    }

    const response = await fetch(`/api/tools/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: editLabel.trim(),
        description: editDescription.trim(),
        visibleToUser: editVisible,
      }),
    });

    const data = (await response.json()) as { tool?: Tool; message?: string };
    if (!response.ok || !data.tool) {
      setMessage(data.message ?? "No se pudo actualizar.");
      return;
    }

    setTools((prev) =>
      prev.map((tool) => (tool._id === data.tool!._id ? data.tool! : tool))
    );
    cancelEdit();
  };

  const toggleVisibility = async (tool: Tool) => {
    const response = await fetch(`/api/tools/${tool._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: tool.label,
        description: tool.description ?? "",
        visibleToUser: !tool.visibleToUser,
      }),
    });

    const data = (await response.json()) as { tool?: Tool; message?: string };
    if (!response.ok || !data.tool) {
      setMessage(data.message ?? "No se pudo actualizar.");
      return;
    }

    setTools((prev) =>
      prev.map((item) => (item._id === data.tool!._id ? data.tool! : item))
    );
  };

  const deleteTool = async (tool: Tool) => {
    const ok = window.confirm(`Eliminar la herramienta "${tool.label}"?`);
    if (!ok) {
      return;
    }

    const response = await fetch(`/api/tools/${tool._id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessage("No se pudo eliminar.");
      return;
    }

    setTools((prev) => prev.filter((item) => item._id !== tool._id));
  };

  if (!username) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6efe6] px-6">
        <div className="max-w-md rounded-3xl border border-black/10 bg-white/80 p-8 text-center shadow-[0_20px_40px_-30px_rgba(15,23,42,0.6)]">
          <h1 className="text-2xl font-semibold">Sesion no iniciada</h1>
          <p className="mt-3 text-sm text-zinc-600">
            Inicia sesion para ver tu dashboard.
          </p>
          <a
            className="mt-6 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            href="/"
          >
            Ir al login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6efe6] text-zinc-900">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#ffb27a] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#7bb4d9] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Dashboard
            </p>
            <h1 className="text-3xl font-semibold">Hola, {username}</h1>
            <p className="text-sm text-zinc-600">
              Rol actual: {role === "desconocido" ? "sin registro" : role}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-900"
              onClick={() => {
                document.cookie = "deck_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "deck_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                window.location.href = "/";
              }}
            >
              Cerrar sesion
            </button>
          </div>
        </header>

        {message ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-700">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-10 text-sm text-zinc-600">Cargando herramientas...</div>
        ) : null}

        {role === "desconocido" ? (
          <div className="mt-8 rounded-3xl border border-black/10 bg-white/80 p-8">
            <h2 className="text-xl font-semibold">Usuario sin registro</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Registra el usuario para obtener permisos y herramientas.
            </p>
            <a
              className="mt-4 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              href="/register"
            >
              Ir a registro
            </a>
          </div>
        ) : null}

        {role === "admin" ? (
          <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-3xl border border-black/10 bg-white/85 p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
              <h2 className="text-xl font-semibold">Administrar herramientas</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Crea, edita o elimina botones del dashboard.
              </p>

              <div className="mt-6 space-y-4 rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Nueva herramienta
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-900"
                    placeholder="Nombre del boton"
                    value={newLabel}
                    onChange={(event) => setNewLabel(event.target.value)}
                  />
                </div>
                <textarea
                  className="min-h-[80px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-900"
                  placeholder="Descripcion corta"
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                />
                <button
                  className="w-full rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                  type="button"
                  onClick={handleCreateTool}
                >
                  Crear herramienta
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {tools.length === 0 ? (
                  <p className="text-sm text-zinc-600">No hay herramientas creadas.</p>
                ) : null}

                {tools.map((tool) => (
                  <div
                    key={tool._id}
                    className="rounded-2xl border border-black/10 bg-white/70 p-4"
                  >
                    {editingId === tool._id ? (
                      <div className="space-y-3">
                        <input
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                          value={editLabel}
                          onChange={(event) => setEditLabel(event.target.value)}
                        />
                        <textarea
                          className="min-h-[60px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                        />
                        <label className="flex items-center gap-2 text-sm text-zinc-700">
                          <input
                            type="checkbox"
                            checked={editVisible}
                            onChange={(event) => setEditVisible(event.target.checked)}
                          />
                          Visible para usuarios
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                            type="button"
                            onClick={saveEdit}
                          >
                            Guardar
                          </button>
                          <button
                            className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold"
                            type="button"
                            onClick={cancelEdit}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{tool.label}</p>
                            <p className="text-xs text-zinc-600">
                              {tool.description || "Sin descripcion"}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs text-zinc-600">
                            {tool.visibleToUser ? "Visible" : "Oculto"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold"
                            type="button"
                            onClick={() => toggleVisibility(tool)}
                          >
                            {tool.visibleToUser ? "Ocultar" : "Mostrar"}
                          </button>
                          <button
                            className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold"
                            type="button"
                            onClick={() => startEdit(tool)}
                          >
                            Editar
                          </button>
                          <button
                            className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-red-600"
                            type="button"
                            onClick={() => deleteTool(tool)}
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

            <div className="rounded-3xl border border-black/10 bg-white/85 p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)]">
              <h2 className="text-xl font-semibold">Vista usuario</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Estos son los botones que vera un usuario regular.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {visibleTools.length === 0 ? (
                  <p className="text-sm text-zinc-600">No hay botones visibles.</p>
                ) : null}
                {visibleTools.map((tool) => {
                  const href = TOOL_ROUTES[tool.key];
                  const Component = href ? "a" : "button";
                  return (
                    <Component
                      key={tool._id}
                      className="flex flex-col items-start gap-2 rounded-2xl border border-black/10 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-1"
                      type={href ? undefined : "button"}
                      href={href}
                    >
                      <span className="text-sm font-semibold text-zinc-900">
                        {tool.label}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {tool.description || "Sin descripcion"}
                      </span>
                    </Component>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {role === "usuario" ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Herramientas disponibles</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Botones habilitados por el admin.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTools.length === 0 ? (
                <p className="text-sm text-zinc-600">No hay herramientas activas.</p>
              ) : null}
              {visibleTools.map((tool) => {
                const href = TOOL_ROUTES[tool.key];
                const Component = href ? "a" : "button";
                return (
                  <Component
                    key={tool._id}
                    className="flex flex-col items-start gap-2 rounded-2xl border border-black/10 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-1"
                    type={href ? undefined : "button"}
                    href={href}
                  >
                    <span className="text-sm font-semibold text-zinc-900">
                      {tool.label}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {tool.description || "Sin descripcion"}
                    </span>
                  </Component>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
