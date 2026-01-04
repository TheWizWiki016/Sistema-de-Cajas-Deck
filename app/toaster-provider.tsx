"use client";

import { Toaster } from "sonner";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      toastOptions={{
        className:
          "border border-white/10 bg-[var(--panel-90)] text-zinc-100 shadow-[0_16px_40px_-30px_rgba(15,61,54,0.7)]",
        descriptionClassName: "text-zinc-300",
      }}
    />
  );
}
