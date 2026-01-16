"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_THEME_ID } from "@/lib/themes";

type Tool = {
  _id: string;
  key: string;
  label: string;
  description?: string;
  visibleToUser: boolean;
};

type RoleResponse = {
  role: "super-root" | "admin" | "usuario" | null;
};

type ToolsResponse = {
  tools: Tool[];
};

type SettingsResponse = {
  themeId?: string;
  dashboard?: {
    columns?: number;
    order?: string[];
    adminOrder?: string[];
  };
};

type Corte = {
  _id: string;
  username: string;
  caja: string;
  corteTeorico: number;
  corteReal: number;
  depositado: number;
  pico: number;
  diferencia: number;
  fondoValidado: boolean;
  fondoCantidad?: number;
  pendientes: { text: string; done: boolean }[];
  isAdjustment?: boolean;
  originalId?: string | null;
  adjustedBy?: string;
  adjustmentNote?: string;
  createdAt: string;
};

type ChangeRequest = {
  _id: string;
  itemId: string;
  alfanumerico: string;
  nombre?: string;
  upc?: string;
  issues: string[];
  notes?: string;
  status?: string;
  username?: string;
  createdAt: string;
};

type CortesResponse = {
  cortes: Corte[];
  message?: string;
};

type AjusteForm = {
  caja: string;
  corteTeorico: string;
  corteReal: string;
  depositado: string;
  fondoValidado: boolean;
  fondoCantidad: string;
};

const ADMIN_CAJAS = ["Caja 1", "Caja 2"];

const TOOL_ROUTES: Record<string, string> = {
  "imprimir-precios": "/tools/imprimir-precios",
  conteos: "/tools/conteos",
  "conteos-selectivos": "/tools/conteos-selectivos",
  cortes: "/tools/cortes",
  articulos: "/tools/articulos",
  familias: "/tools/familias",
  "conteo-de-cerveza": "/tools/conteo-de-cerveza",
};

const ADMIN_ONLY_TOOLS = new Set(["articulos", "familias"]);

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
  const [role, setRole] = useState<
    "super-root" | "admin" | "usuario" | "desconocido"
  >("desconocido");
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [dashboardColumns, setDashboardColumns] = useState(3);
  const [dashboardOrder, setDashboardOrder] = useState<string[]>([]);
  const [editingOrder, setEditingOrder] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [adminOrder, setAdminOrder] = useState<string[]>([]);
  const [editingAdminOrder, setEditingAdminOrder] = useState(false);
  const [dragAdminKey, setDragAdminKey] = useState<string | null>(null);
  const [savingAdminOrder, setSavingAdminOrder] = useState(false);

  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisible, setEditVisible] = useState(true);

  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [adminCortes, setAdminCortes] = useState<Corte[]>([]);
  const [loadingCortes, setLoadingCortes] = useState(false);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loadingChangeRequests, setLoadingChangeRequests] = useState(false);
  const [editingCorteId, setEditingCorteId] = useState<string | null>(null);
  const [savingAjuste, setSavingAjuste] = useState(false);
  const [ajusteNote, setAjusteNote] = useState("");
  const [ajusteForm, setAjusteForm] = useState<AjusteForm>({
    caja: "",
    corteTeorico: "",
    corteReal: "",
    depositado: "",
    fondoValidado: false,
    fondoCantidad: "",
  });
  const [adminCorteCaja, setAdminCorteCaja] = useState("");
  const [adminCorteTeorico, setAdminCorteTeorico] = useState("");
  const [adminCorteReal, setAdminCorteReal] = useState("");
  const [adminCorteDepositado, setAdminCorteDepositado] = useState("");
  const [adminCorteFondoValidado, setAdminCorteFondoValidado] = useState<
    "si" | "no"
  >("no");
  const [adminCorteFondoCantidad, setAdminCorteFondoCantidad] = useState("");
  const [savingAdminCorte, setSavingAdminCorte] = useState(false);
  const [roleUsername, setRoleUsername] = useState("");
  const [roleValue, setRoleValue] = useState("usuario");
  const [savingRole, setSavingRole] = useState(false);

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
      fetch("/api/settings"),
    ])
      .then(async ([roleRes, toolsRes, settingsRes]) => {
        const roleData = (await roleRes.json()) as RoleResponse;
        const toolsData = (await toolsRes.json()) as ToolsResponse;
        const settingsData = (await settingsRes.json()) as SettingsResponse;
        if (!alive) {
          return;
        }
        if (!roleRes.ok || !roleData.role) {
          setRole("desconocido");
        } else {
          setRole(roleData.role);
        }
        setTools(toolsData.tools ?? []);
        setThemeId(settingsData.themeId ?? DEFAULT_THEME_ID);
        setDashboardColumns(settingsData.dashboard?.columns ?? 3);
        setDashboardOrder(settingsData.dashboard?.order ?? []);
        setAdminOrder(settingsData.dashboard?.adminOrder ?? []);
      })
      .catch(() => {
        if (!alive) {
          return;
        }
        toast.error("No se pudieron cargar las herramientas.");
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

  useEffect(() => {
    if (role === "admin" || role === "super-root") {
      loadAdminCortes();
      loadChangeRequests();
    }
  }, [role]);

  const visibleTools = useMemo(
    () => tools.filter((tool) => tool.visibleToUser),
    [tools]
  );
  const orderedVisibleTools = useMemo(() => {
    if (dashboardOrder.length === 0) {
      return visibleTools;
    }
    const indexMap = new Map(dashboardOrder.map((key, index) => [key, index]));
    return [...visibleTools].sort((a, b) => {
      const aIndex = indexMap.get(a.key);
      const bIndex = indexMap.get(b.key);
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
  }, [visibleTools, dashboardOrder]);
  const userVisibleTools = useMemo(
    () => orderedVisibleTools.filter((tool) => !ADMIN_ONLY_TOOLS.has(tool.key)),
    [orderedVisibleTools]
  );
  const gridClass = useMemo(() => {
    switch (dashboardColumns) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-1 sm:grid-cols-2";
      case 4:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
      case 3:
      default:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    }
  }, [dashboardColumns]);

  const ADMIN_SECTION_KEYS = [
    "tools",
    "users",
    "cuts",
    "change-requests",
    "admin-access",
    "user-view",
  ];
  const adminOrderIndex = (key: string) => {
    const index = adminOrder.indexOf(key);
    return index === -1 ? ADMIN_SECTION_KEYS.indexOf(key) : index;
  };

  const handleDrop = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) {
      return;
    }
    setDashboardOrder((prev) => {
      const base = prev.length
        ? [...prev]
        : orderedVisibleTools.map((tool) => tool.key);
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

  const saveDashboardOrder = async () => {
    setSavingOrder(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId,
          dashboard: {
            columns: dashboardColumns,
            order: dashboardOrder,
            adminOrder,
          },
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        toast.error(data.message ?? "No se pudo guardar la distribucion.");
        return;
      }
      toast.success("Distribucion guardada.");
      setEditingOrder(false);
    } catch (error) {
      toast.error("Error de red al guardar la distribucion.");
    } finally {
      setSavingOrder(false);
    }
  };

  const adminSections = useMemo(
    () => [
      { key: "tools", label: "Administrar herramientas" },
      { key: "users", label: "Usuarios" },
      { key: "cuts", label: "Cortes de usuarios" },
      { key: "change-requests", label: "Solicitudes de cambio" },
      { key: "admin-access", label: "Accesos super root" },
      { key: "user-view", label: "Vista usuario" },
    ],
    []
  );
  const orderedAdminSections = useMemo(() => {
    if (adminOrder.length === 0) {
      return adminSections;
    }
    const indexMap = new Map(adminOrder.map((key, index) => [key, index]));
    return [...adminSections].sort((a, b) => {
      const aIndex = indexMap.get(a.key);
      const bIndex = indexMap.get(b.key);
      if (aIndex === undefined && bIndex === undefined) {
        return 0;
      }
      if (aIndex === undefined) {
        return 1;
      }
      if (bIndex === undefined) {
        return -1;
      }
      return aIndex - bIndex;
    });
  }, [adminSections, adminOrder]);

  const handleAdminDrop = (targetKey: string) => {
    if (!dragAdminKey || dragAdminKey === targetKey) {
      return;
    }
    setAdminOrder((prev) => {
      const base = prev.length ? [...prev] : adminSections.map((item) => item.key);
      const fromIndex = base.indexOf(dragAdminKey);
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

  const saveAdminOrder = async () => {
    setSavingAdminOrder(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId,
          dashboard: {
            columns: dashboardColumns,
            order: dashboardOrder,
            adminOrder,
          },
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        toast.error(data.message ?? "No se pudo guardar la distribucion.");
        return;
      }
      toast.success("Distribucion guardada.");
      setEditingAdminOrder(false);
    } catch (error) {
      toast.error("Error de red al guardar la distribucion.");
    } finally {
      setSavingAdminOrder(false);
    }
  };

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
      }),
    []
  );
  const formatCurrency = (value: number) => currencyFormatter.format(value);
  const formatSignedCurrency = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatCurrency(value)}`;
  };
  const roleLabel =
    role === "super-root"
      ? "super root"
      : role === "desconocido"
      ? "sin registro"
      : role;
  const parseNumberInput = (value: string) => {
    const normalized = value.replace(/[^\d.,-]/g, "").trim();
    if (!normalized) {
      return null;
    }
    const usesCommaAsDecimal =
      normalized.includes(",") && !normalized.includes(".");
    const cleaned = usesCommaAsDecimal
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "");
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const { originalCortes, ajustesPorOriginal } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);

    const originals: Corte[] = [];
    const ajustes = new Map<string, Corte[]>();
    adminCortes.forEach((corte) => {
      const createdAt = new Date(corte.createdAt);
      if (Number.isNaN(createdAt.getTime()) || createdAt < yesterdayStart) {
        return;
      }
      if (corte.isAdjustment && corte.originalId) {
        const list = ajustes.get(corte.originalId) ?? [];
        list.push(corte);
        ajustes.set(corte.originalId, list);
      } else {
        originals.push(corte);
      }
    });
    return { originalCortes: originals, ajustesPorOriginal: ajustes };
  }, [adminCortes]);

  const startAjuste = (corte: Corte) => {
    setEditingCorteId(corte._id);
    setAjusteNote("");
    setAjusteForm({
      caja: corte.caja ?? "",
      corteTeorico: String(corte.corteTeorico ?? ""),
      corteReal: String(corte.corteReal ?? ""),
      depositado: String(corte.depositado ?? ""),
      fondoValidado: Boolean(corte.fondoValidado),
      fondoCantidad:
        corte.fondoCantidad !== undefined ? String(corte.fondoCantidad) : "",
    });
  };

  const cancelAjuste = () => {
    setEditingCorteId(null);
    setAjusteNote("");
    setAjusteForm({
      caja: "",
      corteTeorico: "",
      corteReal: "",
      depositado: "",
      fondoValidado: false,
      fondoCantidad: "",
    });
  };

  const saveAdminCorte = async () => {
    const corteTeoricoValue = parseNumberInput(adminCorteTeorico);
    const corteRealValue = parseNumberInput(adminCorteReal);
    const depositadoValue = parseNumberInput(adminCorteDepositado);
    const fondoCantidadValue = parseNumberInput(adminCorteFondoCantidad);

    if (!adminCorteCaja) {
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

    if (adminCorteFondoValidado === "si" && fondoCantidadValue === null) {
      toast.error("Ingresa la cantidad del fondo validado.");
      return;
    }

    setSavingAdminCorte(true);
    try {
      const diferenciaValue = corteRealValue - corteTeoricoValue;
      const picoValue = corteRealValue - depositadoValue;
      const response = await fetch("/api/cortes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caja: adminCorteCaja,
          corteTeorico: corteTeoricoValue,
          corteReal: corteRealValue,
          diferencia: diferenciaValue,
          depositado: depositadoValue,
          pico: picoValue,
          fondoValidado: adminCorteFondoValidado === "si",
          fondoCantidad:
            adminCorteFondoValidado === "si"
              ? fondoCantidadValue ?? 0
              : undefined,
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        toast.error(data.message ?? "No se pudo guardar el corte.");
        return;
      }
      toast.success("Corte guardado.");
      setAdminCorteCaja("");
      setAdminCorteTeorico("");
      setAdminCorteReal("");
      setAdminCorteDepositado("");
      setAdminCorteFondoValidado("no");
      setAdminCorteFondoCantidad("");
      loadAdminCortes();
    } catch (error) {
      toast.error("Error de red al guardar el corte.");
    } finally {
      setSavingAdminCorte(false);
    }
  };

  const saveAjuste = async () => {
    if (!editingCorteId) {
      return;
    }
    setSavingAjuste(true);
    try {
      const corteTeoricoValue = parseNumberInput(ajusteForm.corteTeorico);
      const corteRealValue = parseNumberInput(ajusteForm.corteReal);
      const depositadoValue = parseNumberInput(ajusteForm.depositado);
      const fondoCantidadValue = parseNumberInput(ajusteForm.fondoCantidad);

      if (!ajusteForm.caja.trim()) {
        toast.error("La caja es requerida.");
        setSavingAjuste(false);
        return;
      }
      if (corteTeoricoValue === null || corteRealValue === null) {
        toast.error("Completa corte teorico y corte real.");
        setSavingAjuste(false);
        return;
      }
      if (depositadoValue === null) {
        toast.error("Ingresa el monto depositado.");
        setSavingAjuste(false);
        return;
      }
      if (ajusteForm.fondoValidado && fondoCantidadValue === null) {
        toast.error("Ingresa la cantidad del fondo validado.");
        setSavingAjuste(false);
        return;
      }

      const diferenciaValue = corteRealValue - corteTeoricoValue;
      const picoValue = corteRealValue - depositadoValue;
      const response = await fetch("/api/cortes/ajustes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalId: editingCorteId,
          caja: ajusteForm.caja,
          corteTeorico: corteTeoricoValue,
          corteReal: corteRealValue,
          diferencia: diferenciaValue,
          depositado: depositadoValue,
          pico: picoValue,
          fondoValidado: ajusteForm.fondoValidado,
          fondoCantidad:
            ajusteForm.fondoValidado && fondoCantidadValue !== null
              ? fondoCantidadValue
              : undefined,
          note: ajusteNote,
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        toast.error(data.message ?? "No se pudo guardar el ajuste.");
        return;
      }
      toast.success("Ajuste guardado.");
      cancelAjuste();
      loadAdminCortes();
    } catch (error) {
      toast.error("Error de red al guardar el ajuste.");
    } finally {
      setSavingAjuste(false);
    }
  };

  const assignRole = async () => {
    if (!roleUsername.trim()) {
      toast.error("Agrega un usuario.");
      return;
    }
    setSavingRole(true);
    try {
      const response = await fetch("/api/users/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: roleUsername.trim(),
          role: roleValue,
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        toast.error(data.message ?? "No se pudo actualizar el rol.");
        return;
      }
      toast.success("Rol actualizado.");
      setRoleUsername("");
      setRoleValue("usuario");
    } catch (error) {
      toast.error("Error de red al actualizar el rol.");
    } finally {
      setSavingRole(false);
    }
  };

  const renderCortesBody = (showAdminForm: boolean) => {
    const adminTeorico = parseNumberInput(adminCorteTeorico);
    const adminReal = parseNumberInput(adminCorteReal);
    const adminDepositado = parseNumberInput(adminCorteDepositado);
    const adminCompleto =
      adminTeorico !== null && adminReal !== null && adminDepositado !== null;
    const adminDiferencia = adminCompleto ? adminReal - adminTeorico : null;
    const adminPico = adminCompleto ? adminReal - adminDepositado : null;

    return (
      <>
      {showAdminForm ? (
        <div className="mb-6 rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Nuevo corte (admin)
              </h3>
              <p className="text-xs text-zinc-400">
                Guarda un corte como admin.
              </p>
            </div>
            <button
              className="rounded-full bg-[#0f3d36] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0b2a24] disabled:opacity-70"
              type="button"
              onClick={saveAdminCorte}
              disabled={savingAdminCorte}
            >
              {savingAdminCorte ? "Guardando..." : "Guardar corte"}
            </button>
          </div>

          <div className="mt-2 grid gap-3 text-xs text-zinc-400 sm:grid-cols-2">
            <label>
              Caja
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                value={adminCorteCaja}
                onChange={(event) => setAdminCorteCaja(event.target.value)}
              >
                <option value="">Selecciona una caja</option>
                {ADMIN_CAJAS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Corte teorico
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                type="text"
                inputMode="decimal"
                value={adminCorteTeorico}
                onChange={(event) => setAdminCorteTeorico(event.target.value)}
              />
            </label>
            <label>
              Corte real
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                type="text"
                inputMode="decimal"
                value={adminCorteReal}
                onChange={(event) => setAdminCorteReal(event.target.value)}
              />
            </label>
            <label>
              Depositado
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                type="text"
                inputMode="decimal"
                value={adminCorteDepositado}
                onChange={(event) =>
                  setAdminCorteDepositado(event.target.value)
                }
              />
            </label>
            <label>
              Fondo validado
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                value={adminCorteFondoValidado}
                onChange={(event) =>
                  setAdminCorteFondoValidado(
                    event.target.value as "si" | "no"
                  )
                }
              >
                <option value="no">No</option>
                <option value="si">Si</option>
              </select>
            </label>
            <label>
              Fondo cantidad
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                type="text"
                inputMode="decimal"
                value={adminCorteFondoCantidad}
                onChange={(event) =>
                  setAdminCorteFondoCantidad(event.target.value)
                }
              />
            </label>
          </div>
          <div className="mt-2 grid gap-3 text-xs text-zinc-300 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[var(--panel)] p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                Diferencia
              </p>
              <p className="mt-2 text-sm font-semibold">
                {adminDiferencia === null
                  ? "--"
                  : formatSignedCurrency(adminDiferencia)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[var(--panel)] p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                Pico
              </p>
              <p className="mt-2 text-sm font-semibold">
                {adminPico === null ? "--" : formatSignedCurrency(adminPico)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Cortes de usuarios</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Vista de hoy y ayer.
          </p>
        </div>
        <button
          className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#7c1127]"
          type="button"
          onClick={loadAdminCortes}
        >
          Actualizar
        </button>
      </div>

      <div className="mt-2 space-y-2">
        {loadingCortes ? (
          <p className="text-sm text-zinc-400">Cargando cortes...</p>
        ) : null}
        {!loadingCortes && originalCortes.length === 0 ? (
          <p className="text-sm text-zinc-400">No hay cortes registrados.</p>
        ) : null}
        {originalCortes.map((corte) => {
          const ajustes = ajustesPorOriginal.get(corte._id) ?? [];
          const isEditing = editingCorteId === corte._id;
          const ajusteTeorico = parseNumberInput(ajusteForm.corteTeorico);
          const ajusteReal = parseNumberInput(ajusteForm.corteReal);
          const ajusteDepositado = parseNumberInput(ajusteForm.depositado);
          const ajusteCompleto =
            ajusteTeorico !== null &&
            ajusteReal !== null &&
            ajusteDepositado !== null;
          const nuevaDiferencia = ajusteCompleto
            ? ajusteReal - ajusteTeorico
            : null;
          const nuevoPico = ajusteCompleto
            ? ajusteReal - ajusteDepositado
            : null;
          return (
            <div
              key={corte._id}
              className="rounded-2xl border border-white/10 bg-[var(--surface)] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {corte.username || "Usuario"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {new Date(corte.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full bg-[var(--panel)] px-3 py-1 text-xs ${
                    corte.diferencia < 0
                      ? "text-red-400"
                      : corte.diferencia > 0
                      ? "text-emerald-400"
                      : "text-zinc-200"
                  }`}
                >
                  Diferencia {formatSignedCurrency(corte.diferencia)}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-3">
                <div>Caja: {corte.caja || "Sin caja"}</div>
                <div>Corte teorico: {formatCurrency(corte.corteTeorico)}</div>
                <div>Corte real: {formatCurrency(corte.corteReal)}</div>
                <div>Depositado: {formatCurrency(corte.depositado)}</div>
                <div>Pico: {formatSignedCurrency(corte.pico)}</div>
                <div>
                  Fondo:{" "}
                  {corte.fondoValidado
                    ? corte.fondoCantidad !== undefined
                      ? formatCurrency(corte.fondoCantidad)
                      : "Validado"
                    : "No validado"}
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
                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Pendientes
                  </p>
                  <div className="space-y-2">
                    {corte.pendientes.map((task, index) => (
                      <div
                        key={`${corte._id}-pendiente-${index}`}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--panel)] px-3 py-2"
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

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  className="rounded-full border border-white/10 bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-[#0f3d36]"
                  type="button"
                  onClick={() => startAjuste(corte)}
                >
                  Validar / Ajustar
                </button>
                {ajustes.length > 0 ? (
                  <span className="text-xs text-zinc-400">
                    Ajustes: {ajustes.length}
                  </span>
                ) : null}
              </div>

              {isEditing ? (
                <div className="mt-3 grid gap-3 rounded-2xl border border-white/10 bg-[var(--panel)] p-3 sm:grid-cols-2">
                  <label className="text-xs text-zinc-400">
                    Caja
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                      value={ajusteForm.caja}
                      onChange={(event) =>
                        setAjusteForm((prev) => ({
                          ...prev,
                          caja: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Corte teorico
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                      type="number"
                      value={ajusteForm.corteTeorico}
                      onChange={(event) =>
                        setAjusteForm((prev) => ({
                          ...prev,
                          corteTeorico: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Corte real
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                      type="number"
                      value={ajusteForm.corteReal}
                      onChange={(event) =>
                        setAjusteForm((prev) => ({
                          ...prev,
                          corteReal: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Depositado
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                      type="number"
                      value={ajusteForm.depositado}
                      onChange={(event) =>
                        setAjusteForm((prev) => ({
                          ...prev,
                          depositado: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Fondo validado
                    <select
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                      value={ajusteForm.fondoValidado ? "si" : "no"}
                      onChange={(event) =>
                        setAjusteForm((prev) => ({
                          ...prev,
                          fondoValidado: event.target.value === "si",
                        }))
                      }
                    >
                      <option value="no">No</option>
                      <option value="si">Si</option>
                    </select>
                  </label>
                  <label className="text-xs text-zinc-400">
                    Fondo cantidad
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                      type="number"
                      value={ajusteForm.fondoCantidad}
                      onChange={(event) =>
                        setAjusteForm((prev) => ({
                          ...prev,
                          fondoCantidad: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                        Antes
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-zinc-300">
                        <div>
                          Diferencia:{" "}
                          <span className={corte.diferencia < 0 ? "text-red-400" : corte.diferencia > 0 ? "text-emerald-400" : "text-zinc-200"}>
                            {formatSignedCurrency(corte.diferencia)}
                          </span>
                        </div>
                        <div>Pico: {formatSignedCurrency(corte.pico)}</div>
                        <div>
                          Corte teorico: {formatCurrency(corte.corteTeorico)}
                        </div>
                        <div>Corte real: {formatCurrency(corte.corteReal)}</div>
                        <div>
                          Depositado: {formatCurrency(corte.depositado)}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                        Nuevo
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-zinc-300">
                        <div>
                          Diferencia:{" "}
                          {nuevaDiferencia === null ? (
                            "--"
                          ) : (
                            <span
                              className={
                                nuevaDiferencia < 0
                                  ? "text-red-400"
                                  : nuevaDiferencia > 0
                                  ? "text-emerald-400"
                                  : "text-zinc-200"
                              }
                            >
                              {formatSignedCurrency(nuevaDiferencia)}
                            </span>
                          )}
                        </div>
                        <div>
                          Pico:{" "}
                          {nuevoPico === null
                            ? "--"
                            : formatSignedCurrency(nuevoPico)}
                        </div>
                        <div>
                          Corte teorico:{" "}
                          {ajusteCompleto
                            ? formatCurrency(ajusteTeorico)
                            : "--"}
                        </div>
                        <div>
                          Corte real:{" "}
                          {ajusteCompleto ? formatCurrency(ajusteReal) : "--"}
                        </div>
                        <div>
                          Depositado:{" "}
                          {ajusteCompleto
                            ? formatCurrency(ajusteDepositado)
                            : "--"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <label className="text-xs text-zinc-400 sm:col-span-2">
                    Nota de validacion
                    <textarea
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                      rows={2}
                      value={ajusteNote}
                      onChange={(event) => setAjusteNote(event.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button
                      className="rounded-full bg-[#0f3d36] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0b2a24] disabled:opacity-70"
                      type="button"
                      onClick={saveAjuste}
                      disabled={savingAjuste}
                    >
                      {savingAjuste ? "Guardando..." : "Guardar ajuste"}
                    </button>
                    <button
                      className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200"
                      type="button"
                      onClick={cancelAjuste}
                      disabled={savingAjuste}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}

              {ajustes.length > 0 ? (
                <div className="mt-2 space-y-2 border-t border-white/10 pt-3">
                  {ajustes.map((ajuste) => (
                    <div key={ajuste._id} className="text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-200">
                        Ajuste
                      </span>{" "}
                      {ajuste.adjustedBy ? `por ${ajuste.adjustedBy}` : ""} ·{" "}
                      {new Date(ajuste.createdAt).toLocaleString()}
                      {ajuste.adjustmentNote
                        ? ` · ${ajuste.adjustmentNote}`
                        : ""}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      </>
    );
  };

  const handleCreateTool = async () => {
    if (!newLabel.trim()) {
      toast.error("Agrega un nombre para la herramienta.");
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
      toast.error(data.message ?? "No se pudo crear la herramienta.");
      return;
    }

    setTools((prev) => [...prev, data.tool!]);
    setNewLabel("");
    setNewDescription("");
    toast.success("Herramienta creada.");
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
      toast.error(data.message ?? "No se pudo actualizar.");
      return;
    }

    setTools((prev) =>
      prev.map((tool) => (tool._id === data.tool!._id ? data.tool! : tool))
    );
    cancelEdit();
    toast.success("Herramienta actualizada.");
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
      toast.error(data.message ?? "No se pudo actualizar.");
      return;
    }

    setTools((prev) =>
      prev.map((item) => (item._id === data.tool!._id ? data.tool! : item))
    );
    toast.success("Visibilidad actualizada.");
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
      toast.error("No se pudo eliminar.");
      return;
    }

    setTools((prev) => prev.filter((item) => item._id !== tool._id));
    toast.success("Herramienta eliminada.");
  };

  const createUser = async () => {
    if (!userUsername.trim()) {
      toast.error("Agrega un usuario para crear.");
      return;
    }

    const response = await fetch("/api/users/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: userUsername.trim(),
        password: userPassword.trim() || "",
      }),
    });

    const data = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || !data.ok) {
      toast.error(data.message ?? "No se pudo crear el usuario.");
      return;
    }

    setUserUsername("");
    setUserPassword("");
    toast.success("Usuario creado.");
  };

  const resetUserPassword = async () => {
    if (!resetUsername.trim()) {
      toast.error("Agrega el usuario a actualizar.");
      return;
    }

    const response = await fetch("/api/users/manage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: resetUsername.trim(),
        password: resetPassword.trim(),
      }),
    });

    const data = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || !data.ok) {
      toast.error(data.message ?? "No se pudo actualizar el usuario.");
      return;
    }

    setResetUsername("");
    setResetPassword("");
    toast.success("Contrasena actualizada.");
  };

  const loadAdminCortes = async () => {
    setLoadingCortes(true);
    try {
      const response = await fetch("/api/cortes?all=1");
      const data = (await response.json()) as CortesResponse;
      if (response.ok) {
        setAdminCortes(data.cortes ?? []);
      } else {
        toast.error(data.message ?? "No se pudieron cargar los cortes.");
      }
    } finally {
      setLoadingCortes(false);
    }
  };

  const loadChangeRequests = async () => {
    setLoadingChangeRequests(true);
    try {
      const response = await fetch("/api/change-requests");
      const data = (await response.json()) as { requests?: ChangeRequest[]; message?: string };
      if (!response.ok) {
        toast.error(data.message ?? "No se pudieron cargar los reportes.");
        return;
      }
      setChangeRequests(data.requests ?? []);
    } catch (error) {
      toast.error("Error de red al cargar los reportes.");
    } finally {
      setLoadingChangeRequests(false);
    }
  };

  if (!username) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6">
        <div className="max-w-md rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 text-center shadow-[0_20px_40px_-30px_rgba(124,17,39,0.6)]">
          <h1 className="text-2xl font-semibold text-zinc-100">
            Sesion no iniciada
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Inicia sesion para ver tu dashboard.
          </p>
          <a
            className="mt-3 inline-flex rounded-full bg-[#7c1127] px-4 py-2 text-sm font-semibold text-white"
            href="/"
          >
            Ir al login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-zinc-100">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#7c1127] opacity-35 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#0f3d36] opacity-35 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Dashboard
            </p>
            <h1 className="text-3xl font-semibold">Hola, {username}</h1>
            <p className="text-sm text-zinc-400">
              Rol actual: {roleLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#7c1127]"
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

        {loading ? (
          <div className="mt-4 text-sm text-zinc-400">Cargando herramientas...</div>
        ) : null}

        {role === "desconocido" ? (
          <div className="mt-4 rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6">
            <h2 className="text-xl font-semibold">Usuario sin registro</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Solicita al super root que cree tu usuario.
            </p>
          </div>
        ) : null}

        {role === "super-root" ? (
          <section className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Panel super root</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#7c1127]"
                  type="button"
                  onClick={() => setEditingAdminOrder((prev) => !prev)}
                >
                  {editingAdminOrder ? "Salir de edicion" : "Reordenar secciones"}
                </button>
                {editingAdminOrder ? (
                  <button
                    className="rounded-full bg-[#7c1127] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5c0b1c] disabled:opacity-70"
                    type="button"
                    onClick={saveAdminOrder}
                    disabled={savingAdminOrder}
                  >
                    {savingAdminOrder ? "Guardando..." : "Guardar orden"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-4">
              <div
                className={`w-full lg:w-[calc(50%-1rem)] ${
                  editingAdminOrder ? "cursor-move" : ""
                }`}
                style={{ order: adminOrderIndex("tools") }}
                draggable={editingAdminOrder}
                onDragStart={() => setDragAdminKey("tools")}
                onDragEnd={() => setDragAdminKey(null)}
                onDragOver={(event) =>
                  editingAdminOrder ? event.preventDefault() : undefined
                }
                onDrop={() =>
                  editingAdminOrder ? handleAdminDrop("tools") : undefined
                }
              >
                <div
                  className={`rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6 shadow-[0_30px_60px_-40px_rgba(124,17,39,0.55)] ${
                    dragAdminKey === "tools" ? "opacity-60" : ""
                  }`}
                >
                <h2 className="text-xl font-semibold">Administrar herramientas</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Crea, edita o elimina botones del dashboard.
                </p>

                <div className="mt-3 space-y-2 rounded-2xl border border-dashed border-white/10 bg-[var(--surface-70)] p-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Nueva herramienta
                    </label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                      placeholder="Nombre del boton"
                      value={newLabel}
                      onChange={(event) => setNewLabel(event.target.value)}
                    />
                  </div>
                  <textarea
                    className="min-h-[80px] w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                    placeholder="Descripcion corta"
                    value={newDescription}
                    onChange={(event) => setNewDescription(event.target.value)}
                  />
                  <button
                    className="w-full rounded-2xl bg-[#7c1127] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5c0b1c]"
                    type="button"
                    onClick={handleCreateTool}
                  >
                    Crear herramienta
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {tools.length === 0 ? (
                    <p className="text-sm text-zinc-400">No hay herramientas creadas.</p>
                  ) : null}

                  {tools.map((tool) => (
                    <div
                      key={tool._id}
                      className="rounded-2xl border border-white/10 bg-[var(--panel-80)] p-4"
                    >
                      {editingId === tool._id ? (
                        <div className="space-y-3">
                          <input
                            className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100"
                            value={editLabel}
                            onChange={(event) => setEditLabel(event.target.value)}
                          />
                          <textarea
                            className="min-h-[60px] w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-zinc-100"
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                          />
                          <label className="flex items-center gap-2 text-sm text-zinc-300">
                            <input
                              type="checkbox"
                              checked={editVisible}
                              onChange={(event) => setEditVisible(event.target.checked)}
                            />
                            Visible para usuarios
                          </label>
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
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-zinc-100">{tool.label}</p>
                              <p className="text-xs text-zinc-400">
                                {tool.description || "Sin descripcion"}
                              </p>
                            </div>
                            <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs text-zinc-400">
                              {tool.visibleToUser ? "Visible" : "Oculto"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              className="rounded-full border border-white/10 bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-[#7c1127]"
                              type="button"
                              onClick={() => toggleVisibility(tool)}
                            >
                              {tool.visibleToUser ? "Ocultar" : "Mostrar"}
                            </button>
                            <button
                              className="rounded-full border border-white/10 bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-zinc-200 hover:border-[#7c1127]"
                              type="button"
                              onClick={() => startEdit(tool)}
                            >
                              Editar
                            </button>
                            <button
                              className="rounded-full border border-white/10 bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-red-400 hover:border-red-400"
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

            </div>

              <div
                className={`w-full lg:w-[calc(50%-1rem)] ${
                  editingAdminOrder ? "cursor-move" : ""
                }`}
                style={{ order: adminOrderIndex("users") }}
                draggable={editingAdminOrder}
                onDragStart={() => setDragAdminKey("users")}
                onDragEnd={() => setDragAdminKey(null)}
                onDragOver={(event) =>
                  editingAdminOrder ? event.preventDefault() : undefined
                }
                onDrop={() =>
                  editingAdminOrder ? handleAdminDrop("users") : undefined
                }
              >
                <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.6)]">
                <h2 className="text-xl font-semibold">Usuarios</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Crea usuarios y restablece contrasenas.
                </p>

                <div className="mt-3 grid gap-3">
                  <div className="rounded-2xl border border-dashed border-white/10 bg-[var(--surface-70)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Nuevo usuario
                    </p>
                    <div className="mt-3 space-y-3">
                      <input
                        className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                        placeholder="Usuario"
                        value={userUsername}
                        onChange={(event) => setUserUsername(event.target.value)}
                      />
                      <input
                        className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                        placeholder="Contrasena (opcional)"
                        type="password"
                        value={userPassword}
                        onChange={(event) => setUserPassword(event.target.value)}
                      />
                      <button
                        className="w-full rounded-2xl bg-[#7c1127] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5c0b1c]"
                        type="button"
                        onClick={createUser}
                      >
                        Crear usuario
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-white/10 bg-[var(--surface-70)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Restablecer contrasena
                    </p>
                    <div className="mt-3 space-y-3">
                      <input
                        className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                        placeholder="Usuario"
                        value={resetUsername}
                        onChange={(event) => setResetUsername(event.target.value)}
                      />
                      <input
                        className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#0f3d36]"
                        placeholder="Nueva contrasena (vaciar para obligar cambio)"
                        type="password"
                        value={resetPassword}
                        onChange={(event) => setResetPassword(event.target.value)}
                      />
                      <button
                        className="w-full rounded-2xl bg-[#0f3d36] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b2a24]"
                        type="button"
                        onClick={resetUserPassword}
                      >
                        Guardar cambio
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-white/10 bg-[var(--surface-70)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Asignar rol
                    </p>
                    <div className="mt-3 space-y-3">
                      <input
                        className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                        placeholder="Usuario"
                        value={roleUsername}
                        onChange={(event) => setRoleUsername(event.target.value)}
                      />
                      <select
                        className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#7c1127]"
                        value={roleValue}
                        onChange={(event) => setRoleValue(event.target.value)}
                      >
                        <option value="usuario">Usuario</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        className="w-full rounded-2xl bg-[#7c1127] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5c0b1c] disabled:opacity-70"
                        type="button"
                        onClick={assignRole}
                        disabled={savingRole}
                      >
                        {savingRole ? "Guardando..." : "Asignar rol"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

              <div
                className={`w-full lg:w-[calc(50%-1rem)] ${
                  editingAdminOrder ? "cursor-move" : ""
                }`}
                style={{ order: adminOrderIndex("cuts") }}
                draggable={editingAdminOrder}
                onDragStart={() => setDragAdminKey("cuts")}
                onDragEnd={() => setDragAdminKey(null)}
                onDragOver={(event) =>
                  editingAdminOrder ? event.preventDefault() : undefined
                }
                onDrop={() =>
                  editingAdminOrder ? handleAdminDrop("cuts") : undefined
                }
              >
                <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6 shadow-[0_30px_60px_-40px_rgba(124,17,39,0.45)]">
                  {renderCortesBody(false)}
                </div>
              </div>

            <div
              className={`w-full lg:w-[calc(50%-1rem)] ${
                editingAdminOrder ? "cursor-move" : ""
              }`}
              style={{ order: adminOrderIndex("change-requests") }}
              draggable={editingAdminOrder}
              onDragStart={() => setDragAdminKey("change-requests")}
              onDragEnd={() => setDragAdminKey(null)}
              onDragOver={(event) =>
                editingAdminOrder ? event.preventDefault() : undefined
              }
              onDrop={() =>
                editingAdminOrder ? handleAdminDrop("change-requests") : undefined
              }
            >
              <div className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.55)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Solicitudes de cambio</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Reportes enviados por usuarios.
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#0f3d36]"
                    type="button"
                    onClick={loadChangeRequests}
                  >
                    Actualizar
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {loadingChangeRequests ? (
                    <p className="text-sm text-zinc-400">Cargando reportes...</p>
                  ) : null}
                  {!loadingChangeRequests && changeRequests.length === 0 ? (
                    <p className="text-sm text-zinc-400">
                      No hay solicitudes pendientes.
                    </p>
                  ) : null}
                  {changeRequests.map((request) => (
                    <div
                      key={request._id}
                      className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">
                            {request.nombre || request.alfanumerico}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {request.alfanumerico}
                            {request.upc ? ` - UPC ${request.upc}` : ""}
                          </p>
                          <p className="mt-2 text-xs text-zinc-500">
                            {request.issues?.length
                              ? request.issues.join(", ")
                              : "Sin motivos"}
                          </p>
                          {request.notes ? (
                            <p className="mt-2 text-xs text-zinc-400">
                              {request.notes}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-xs text-zinc-400">
                          <p>{request.username ?? "Usuario"}</p>
                          <p>{new Date(request.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className={`w-full lg:w-[calc(50%-1rem)] ${
                editingAdminOrder ? "cursor-move" : ""
              }`}
              style={{ order: adminOrderIndex("admin-access") }}
              draggable={editingAdminOrder}
              onDragStart={() => setDragAdminKey("admin-access")}
              onDragEnd={() => setDragAdminKey(null)}
              onDragOver={(event) =>
                editingAdminOrder ? event.preventDefault() : undefined
              }
              onDrop={() =>
                editingAdminOrder ? handleAdminDrop("admin-access") : undefined
              }
            >
              <div
                className={`rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.6)] ${
                  dragAdminKey === "admin-access" ? "opacity-60" : ""
                }`}
              >
                <h2 className="text-xl font-semibold">Accesos super root</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Accesos directos a gestores internos.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <a
                    className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#7c1127]"
                    href="/tools/articulos"
                  >
                    <span className="text-sm font-semibold text-zinc-100">
                      Gestion de articulos
                    </span>
                    <span className="text-xs text-zinc-400">
                      Alta, edicion y carga masiva.
                    </span>
                  </a>
                  <a
                    className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#7c1127]"
                    href="/tools/familias"
                  >
                    <span className="text-sm font-semibold text-zinc-100">
                      Familias de productos
                    </span>
                    <span className="text-xs text-zinc-400">
                      Prefijos y clasificacion de articulos.
                    </span>
                  </a>
                  <a
                    className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#7c1127]"
                    href="/tools/personalizacion"
                  >
                    <span className="text-sm font-semibold text-zinc-100">
                      Personalizacion
                    </span>
                    <span className="text-xs text-zinc-400">
                      Tema global y layout del dashboard.
                    </span>
                  </a>
                  <a
                    className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#7c1127]"
                    href="/tools/conteos-dashboard"
                  >
                    <span className="text-sm font-semibold text-zinc-100">
                      Dashboard de conteos
                    </span>
                    <span className="text-xs text-zinc-400">
                      Revision de conteos guardados.
                    </span>
                  </a>
                </div>
              </div>
            </div>

            <div
              className={`w-full lg:w-[calc(50%-1rem)] ${
                editingAdminOrder ? "cursor-move" : ""
              }`}
              style={{ order: adminOrderIndex("user-view") }}
              draggable={editingAdminOrder}
              onDragStart={() => setDragAdminKey("user-view")}
              onDragEnd={() => setDragAdminKey(null)}
              onDragOver={(event) =>
                editingAdminOrder ? event.preventDefault() : undefined
              }
              onDrop={() =>
                editingAdminOrder ? handleAdminDrop("user-view") : undefined
              }
            >
              <div
                className={`rounded-3xl border border-white/10 bg-[var(--panel-90)] p-6 shadow-[0_30px_60px_-40px_rgba(15,61,54,0.6)] ${
                  dragAdminKey === "user-view" ? "opacity-60" : ""
                }`}
              >
                <h2 className="text-xl font-semibold">Vista usuario</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Estos son los botones que vera un usuario regular.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#7c1127]"
                    type="button"
                    onClick={() => setEditingOrder((prev) => !prev)}
                  >
                    {editingOrder ? "Salir de edicion" : "Reordenar iconos"}
                  </button>
                  {editingOrder ? (
                    <button
                      className="rounded-full bg-[#7c1127] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5c0b1c] disabled:opacity-70"
                      type="button"
                      onClick={saveDashboardOrder}
                      disabled={savingOrder}
                    >
                      {savingOrder ? "Guardando..." : "Guardar orden"}
                    </button>
                  ) : null}
                </div>
                <div className={`mt-3 grid gap-3 ${gridClass}`}>
                  {userVisibleTools.length === 0 ? (
                    <p className="text-sm text-zinc-400">No hay botones visibles.</p>
                  ) : null}
                  {userVisibleTools.map((tool) => {
                    const href = TOOL_ROUTES[tool.key] ?? `/tools/${tool.key}`;
                    const Component = href ? "a" : "button";
                    const isDragging = dragKey === tool.key;
                    return (
                      <Component
                        key={tool._id}
                        className={`flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#7c1127] ${
                          editingOrder ? "cursor-move" : ""
                        } ${isDragging ? "opacity-60" : ""}`}
                        type={href ? undefined : "button"}
                        href={editingOrder ? undefined : href}
                        draggable={editingOrder}
                        onDragStart={() => setDragKey(tool.key)}
                        onDragEnd={() => setDragKey(null)}
                        onDragOver={(event) =>
                          editingOrder ? event.preventDefault() : undefined
                        }
                        onDrop={() =>
                          editingOrder ? handleDrop(tool.key) : undefined
                        }
                      >
                        <span className="text-sm font-semibold text-zinc-100">
                          {tool.label}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {tool.description || "Sin descripcion"}
                        </span>
                      </Component>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          </section>
        ) : null}

        {role === "admin" ? (
          <section className="mt-4">
            <div className={`mt-3 grid gap-3 ${gridClass}`}>
              {userVisibleTools.length === 0 ? (
                <p className="text-sm text-zinc-400">No hay herramientas activas.</p>
              ) : null}
              {userVisibleTools.map((tool) => {
                const href = TOOL_ROUTES[tool.key] ?? `/tools/${tool.key}`;
                const Component = href ? "a" : "button";
                return (
                  <Component
                    key={tool._id}
                    className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#7c1127]"
                    type={href ? undefined : "button"}
                    href={href}
                  >
                    <span className="text-sm font-semibold text-zinc-100">
                      {tool.label}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {tool.description || "Sin descripcion"}
                    </span>
                  </Component>
                );
              })}
            </div>
          </section>
        ) : null}

        {role === "usuario" ? (
          <section className="mt-4">
            <h2 className="text-xl font-semibold">Herramientas disponibles</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Botones habilitados por el super root.
            </p>
            <div className={`mt-3 grid gap-3 ${gridClass}`}>
              {userVisibleTools.length === 0 ? (
                <p className="text-sm text-zinc-400">No hay herramientas activas.</p>
              ) : null}
              {userVisibleTools.map((tool) => {
                const href = TOOL_ROUTES[tool.key] ?? `/tools/${tool.key}`;
                const Component = href ? "a" : "button";
                return (
                  <Component
                    key={tool._id}
                    className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#7c1127]"
                    type={href ? undefined : "button"}
                    href={href}
                  >
                    <span className="text-sm font-semibold text-zinc-100">
                      {tool.label}
                    </span>
                    <span className="text-xs text-zinc-400">
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

