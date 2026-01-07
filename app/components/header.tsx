"use client";

type HeaderProps = {
  subtitle?: string;
};

export default function Header({ subtitle = "EXO: Excelecia Operativa" }: HeaderProps) {
  return (
    <header className="w-full bg-transparent py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        
      </p>
      <p className="mt-1 font-mono text-xs text-zinc-300">{subtitle}</p>
    </header>
  );
}
