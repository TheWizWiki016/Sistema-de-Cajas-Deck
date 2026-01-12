import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { decryptString, hashForSearch } from "@/lib/crypto";

type ToolPageProps = {
  params: { toolKey: string };
};

export default async function ToolPage({ params }: ToolPageProps) {
  const toolKey = typeof params.toolKey === "string" ? params.toolKey.trim() : "";

  if (!toolKey) {
    notFound();
  }

  const db = await getDb();
  const tool = await db
    .collection("tools")
    .findOne({ keyHash: hashForSearch(toolKey) });

  if (!tool) {
    notFound();
  }

  const label = decryptString(tool.label) || toolKey;

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-zinc-100">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#7c1127] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#0f3d36] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Herramienta
            </p>
            <h1 className="text-3xl font-semibold">{label}</h1>
          </div>
          <a
            className="rounded-full border border-white/10 bg-[var(--panel-80)] px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#7c1127]"
            href="/dashboard"
          >
            Volver al dashboard
          </a>
        </header>
      </main>
    </div>
  );
}
