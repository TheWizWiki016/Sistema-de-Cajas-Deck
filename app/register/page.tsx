"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type StatusResponse = {
  hasSuperRoot: boolean;
};

type RegisterResponse = {
  ok: boolean;
  role?: "super-root" | "admin" | "usuario";
  message?: string;
};

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/users/status")
      .then((res) => res.json())
      .then((data: StatusResponse) => {
        if (alive) {
          setStatus(data);
        }
      })
      .catch(() => {
        if (alive) {
          setStatus({ hasSuperRoot: true });
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      toast.error("Completa usuario y contrasena.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = (await response.json()) as RegisterResponse;
      if (!response.ok || !data.ok) {
        toast.error(data.message ?? "No se pudo registrar.");
        return;
      }

      toast.success(
        data.role === "super-root"
          ? "Usuario super root creado. Ya puedes iniciar sesion."
          : "Usuario creado con rol usuario. Ya puedes iniciar sesion."
      );
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setStatus({ hasSuperRoot: true });
    } catch (error) {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6 text-zinc-100">
        <p className="text-sm text-zinc-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-6 text-zinc-100">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(124,17,39,0.65)]">
        <h1 className="text-2xl font-semibold">Crear super root</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Este formulario solo funciona si aun no existe un super root.
        </p>

        {status.hasSuperRoot ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-zinc-300">
              Ya existe un super root. Esta pagina esta bloqueada.
            </p>
            <a
              className="inline-flex text-sm font-semibold text-zinc-200 hover:text-[#e11d48]"
              href="/"
            >
              Ir al login
            </a>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-300">Usuario</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-base text-zinc-100 shadow-sm outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                type="text"
                name="username"
                placeholder="ej: root"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-300">
                Contrasena
              </span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-base text-zinc-100 shadow-sm outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                type="password"
                name="password"
                placeholder="Minimo 6 caracteres"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-300">
                Confirmar contrasena
              </span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-base text-zinc-100 shadow-sm outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                type="password"
                name="confirmPassword"
                placeholder="Repite tu clave"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>

            <button
              className="flex w-full items-center justify-center rounded-2xl bg-[#7c1127] px-4 py-3 text-base font-semibold text-white shadow-lg shadow-[#7c1127]/40 transition hover:translate-y-[-1px] hover:bg-[#5c0b1c] disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={loading}
            >
              {loading ? "Registrando..." : "Crear super root"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


