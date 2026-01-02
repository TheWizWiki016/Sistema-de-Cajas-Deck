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
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    if (!username.trim()) {
      setMessage("Completa usuario para continuar.");
      setLoading(false);
      return;
    }

    let currentPassword = password;
    if (needsPassword) {
      if (!newPassword || newPassword.length < 6) {
        setMessage("La nueva contrasena debe tener al menos 6 caracteres.");
        setLoading(false);
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setMessage("Las contrasenas no coinciden.");
        setLoading(false);
        return;
      }

      const setRes = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: newPassword,
        }),
      });
      const setData = (await setRes.json()) as { ok?: boolean; message?: string };
      if (!setRes.ok || !setData.ok) {
        setMessage(setData.message ?? "No se pudo crear la contrasena.");
        setLoading(false);
        return;
      }
      setNeedsPassword(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setPassword("");
      currentPassword = newPassword;
      setMessage("");
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        password: currentPassword,
      }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      requiresPassword?: boolean;
      message?: string;
    };

    if (!response.ok || !data.ok) {
      setMessage(data.message ?? "No se pudo iniciar sesion.");
      setLoading(false);
      return;
    }

    if (data.requiresPassword) {
      setNeedsPassword(true);
      setMessage("Define una nueva contrasena para continuar.");
      setLoading(false);
      return;
    }

    const days = DEFAULT_COOKIE_DAYS;
    setCookie("deck_user", username.trim(), days);
    setCookie("deck_session", "active", days);

    router.push("/dashboard");
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0b0d] text-zinc-100">
      <div className="pointer-events-none absolute -left-24 top-8 h-80 w-80 rounded-full bg-[#7c1127] opacity-35 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#0f3d36] opacity-35 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight text-zinc-100 sm:text-5xl">
              SistemaDeck Login
            </h1>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#141419]/90 p-8 shadow-[0_30px_60px_-40px_rgba(124,17,39,0.65)] backdrop-blur">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold">Bienvenido de vuelta</h2>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-300">Usuario</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[#0f0f14] px-4 py-3 text-base text-zinc-100 shadow-sm outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                  type="text"
                  name="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>

              {!needsPassword ? (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-300">Contrasena</span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[#0f0f14] px-4 py-3 text-base text-zinc-100 shadow-sm outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                    type="password"
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
              ) : (
                <>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-zinc-300">
                      Nueva contrasena
                    </span>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-[#0f0f14] px-4 py-3 text-base text-zinc-100 shadow-sm outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                      type="password"
                      name="newPassword"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-zinc-300">
                      Confirmar contrasena
                    </span>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-[#0f0f14] px-4 py-3 text-base text-zinc-100 shadow-sm outline-none transition focus:border-[#7c1127] focus:ring-2 focus:ring-[#7c1127]/30"
                      type="password"
                      name="confirmNewPassword"
                      value={confirmNewPassword}
                      onChange={(event) => setConfirmNewPassword(event.target.value)}
                    />
                  </label>
                </>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <span className="text-zinc-400">Sesion activa por 24 horas</span>
                <button
                  type="button"
                  className="text-sm font-semibold text-zinc-200 hover:text-[#e11d48]"
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
                className="flex w-full items-center justify-center rounded-2xl bg-[#7c1127] px-4 py-3 text-base font-semibold text-white shadow-lg shadow-[#7c1127]/40 transition hover:translate-y-[-1px] hover:bg-[#5c0b1c] disabled:cursor-not-allowed disabled:opacity-70"
                type="submit"
                disabled={loading}
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

              {message ? (
                <p
                  className="rounded-2xl border border-white/10 bg-[#0f0f14] px-4 py-3 text-sm text-zinc-300"
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
