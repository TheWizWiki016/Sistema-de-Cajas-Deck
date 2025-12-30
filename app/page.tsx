"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_COOKIE_DAYS = 1;

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!username.trim() || !password) {
      setMessage("Completa usuario y contrasena para continuar.");
      return;
    }

    const days = DEFAULT_COOKIE_DAYS;
    setCookie("deck_user", username.trim(), days);
    setCookie("deck_session", "active", days);

    router.push("/dashboard");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6efe6] text-zinc-900">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#ffb27a] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#7bb4d9] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
              Acceso seguro
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-zinc-900 sm:text-5xl">
              SistemaDeck Login
            </h1>
            <p className="max-w-xl text-lg leading-7 text-zinc-700">
              Entra con tu usuario y contrasena. Guardamos una cookie de sesion
              por 24 horas en este navegador.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
              <span className="rounded-full bg-white/70 px-3 py-1">Usuarios internos</span>
              <span className="rounded-full bg-white/70 px-3 py-1">Sin correo</span>
              <span className="rounded-full bg-white/70 px-3 py-1">Cookies locales</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <a
                className="rounded-full border border-black/10 bg-white/70 px-4 py-2 font-semibold text-zinc-900 transition hover:border-black/40"
                href="/register"
              >
                Crear cuenta
              </a>
              <span className="text-xs text-zinc-600">
                El primer registro se guarda como admin.
              </span>
            </div>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white/80 p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold">Bienvenido de vuelta</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Ingresa tus credenciales para continuar.
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
                  placeholder="Tu clave"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <span className="text-zinc-600">Sesion activa por 24 horas</span>
                <button
                  type="button"
                  className="text-sm font-semibold text-zinc-900 hover:text-black"
                  onClick={() => {
                    document.cookie = "deck_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    document.cookie = "deck_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    setMessage("Cookies borradas. Inicia sesion nuevamente.");
                  }}
                >
                  Borrar cookies
                </button>
              </div>

              <button
                className="flex w-full items-center justify-center rounded-2xl bg-zinc-900 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-zinc-900/25 transition hover:translate-y-[-1px] hover:bg-black"
                type="submit"
              >
                Ingresar
              </button>

              <p className="text-xs text-zinc-500">
                Tip: esta pagina usa cookies para simular autenticacion local.
              </p>

              {message ? (
                <p className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-700" aria-live="polite">
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
