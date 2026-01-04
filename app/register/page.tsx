"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type StatusResponse = {
  hasAdmin: boolean;
};

type RegisterResponse = {
  ok: boolean;
  role?: "admin" | "usuario";
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
          setStatus({ hasAdmin: true });
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
        data.role === "admin"
          ? "Usuario admin creado. Ya puedes iniciar sesion."
          : "Usuario creado con rol usuario. Ya puedes iniciar sesion."
      );
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setStatus({ hasAdmin: true });
    } catch (error) {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-zinc-100">
      <div className="pointer-events-none absolute -left-16 top-8 h-72 w-72 rounded-full bg-[#7c1127] opacity-35 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-[#0f3d36] opacity-35 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <section className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
              Registro
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-zinc-100 sm:text-5xl">
              Crea tu usuario
            </h1>
            <p className="max-w-xl text-lg leading-7 text-zinc-300">
              El primer usuario registrado se crea como admin. Los siguientes
              quedan con rol usuario automaticamente.
            </p>
            <div className="rounded-2xl border border-white/10 bg-[var(--panel-80)] px-4 py-3 text-sm text-zinc-300">
              {status?.hasAdmin === false
                ? "Aun no existe admin. Esta cuenta sera admin."
                : "Admin detectado. La cuenta quedara como usuario."}
            </div>
            <a
              className="inline-flex items-center text-sm font-semibold text-zinc-200 hover:text-[#e11d48]"
              href="/"
            >
              Volver al login
            </a>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[var(--panel-90)] p-8 shadow-[0_30px_60px_-40px_rgba(124,17,39,0.65)] backdrop-blur">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold">Datos de acceso</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Usa usuario y contrasena, sin correo.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-300">Usuario</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] px-4 py-3 text-base text-zinc-100 shadow-sm outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                  type="text"
                  name="username"
                  placeholder="ej: deckadmin"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-300">Contrasena</span>
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
                {loading ? "Registrando..." : "Crear usuario"}
              </button>

            </form>
          </section>
        </div>
      </main>
    </div>
  );
}


