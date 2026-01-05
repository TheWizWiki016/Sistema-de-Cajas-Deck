export type ThemePreset = {
  id: string;
  name: string;
  background: string;
  foreground: string;
  panel: string;
  surface: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "claro",
    name: "Claro",
    background: "#0e1014",
    foreground: "#f4f4f5",
    panel: "#12151b",
    surface: "#0f1217",
  },
  {
    id: "oscuro",
    name: "Oscuro",
    background: "#0b0b0d",
    foreground: "#f4f4f5",
    panel: "#111115",
    surface: "#0c0c11",
  },
  {
    id: "verde",
    name: "Verde",
    background: "#0b1210",
    foreground: "#eaf9f2",
    panel: "#0f1a15",
    surface: "#0c1511",
  },
];

export const DEFAULT_THEME_ID = "oscuro";
