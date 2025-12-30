"use client";

import { useEffect, useState } from "react";

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
  const [message, setMessage] = useState("");
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
    setMessage("");

    if (!username.trim() || !password) {
      setMessage("Completa usuario y contrasena.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Las contrasenas no coinciden.");
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
        setMessage(data.message ?? "No se pudo registrar.");
        return;
      }

      setMessage(
        data.role === "admin"
          ? "Usuario admin creado. Ya puedes iniciar sesion."
          : "Usuario creado con rol usuario. Ya puedes iniciar sesion."
      );
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setStatus({ hasAdmin: true });
    } catch (error) {
      setMessage("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3f0e8] text-zinc-900">
      <div className="pointer-events-none absolute -left-16 top-12 h-72 w-72 rounded-full bg-[#f0b284] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-[#6faad6] opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <section className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
              Registro
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-zinc-900 sm:text-5xl">
              Crea tu usuario
            </h1>
            <p className="max-w-xl text-lg leading-7 text-zinc-700">
              El primer usuario registrado se crea como admin. Los siguientes
              quedan con rol usuario automaticamente.
            </p>
            <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-zinc-700">
              {status?.hasAdmin === false
                ? "Aun no existe admin. Esta cuenta sera admin."
                : "Admin detectado. La cuenta quedara como usuario."}
            </div>
            <a
              className="inline-flex items-center text-sm font-semibold text-zinc-900 hover:text-black"
              href="/"
            >
              Volver al login
            </a>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white/85 p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold">Datos de acceso</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Usa usuario y contrasena, sin correo.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-700">Usuario</span>
                <input
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  type="text"
                  name="username"
                  placeholder="ej: deckadmin"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-700">Contrasena</span>
                <input
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  type="password"
                  name="password"
                  placeholder="Minimo 6 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-700">
                  Confirmar contrasena
                </span>
                <input
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  type="password"
                  name="confirmPassword"
                  placeholder="Repite tu clave"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>

              <button
                className="flex w-full items-center justify-center rounded-2xl bg-zinc-900 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-zinc-900/25 transition hover:translate-y-[-1px] hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                type="submit"
                disabled={loading}
              >
                {loading ? "Registrando..." : "Crear usuario"}
              </button>

              {message ? (
                <p
                  className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-700"
                  aria-live="polite"
                >
                  {message}
                </p>
              ) : null}
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
