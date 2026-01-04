export type ThemePreset = {
  id: string;
  name: string;
  background: string;
  panel: string;
  surface: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: "noir-classic", name: "Noir Classic", background: "#0b0b0d", panel: "#141419", surface: "#0f0f14" },
  { id: "ember-night", name: "Ember Night", background: "#120b0f", panel: "#1f1217", surface: "#140d12" },
  { id: "forest-moss", name: "Forest Moss", background: "#0b1210", panel: "#121c18", surface: "#0f1613" },
  { id: "steel-blue", name: "Steel Blue", background: "#0b1117", panel: "#121b24", surface: "#0f161d" },
  { id: "coal-olive", name: "Coal Olive", background: "#0c0f0b", panel: "#151a12", surface: "#10140e" },
  { id: "charcoal-rose", name: "Charcoal Rose", background: "#120d10", panel: "#1b1318", surface: "#140f12" },
  { id: "deep-ocean", name: "Deep Ocean", background: "#0a1116", panel: "#0f1a22", surface: "#0c141b" },
  { id: "smoke-teal", name: "Smoke Teal", background: "#0c1213", panel: "#142021", surface: "#101818" },
  { id: "midnight-ink", name: "Midnight Ink", background: "#0b0f16", panel: "#141b26", surface: "#0f151d" },
  { id: "bitter-plum", name: "Bitter Plum", background: "#120c13", panel: "#1c131f", surface: "#140f16" },
  { id: "cinder-gold", name: "Cinder Gold", background: "#12100b", panel: "#1c1912", surface: "#15130e" },
  { id: "oxide-green", name: "Oxide Green", background: "#0b1211", panel: "#12201c", surface: "#0f1715" },
  { id: "night-slate", name: "Night Slate", background: "#0b1013", panel: "#151d21", surface: "#10161a" },
  { id: "ember-iron", name: "Ember Iron", background: "#12100e", panel: "#1d1916", surface: "#141210" },
  { id: "pine-shadow", name: "Pine Shadow", background: "#0a120e", panel: "#122018", surface: "#0f1712" },
  { id: "dusty-berry", name: "Dusty Berry", background: "#130d12", panel: "#1f131c", surface: "#140f15" },
  { id: "arctic-night", name: "Arctic Night", background: "#0a1114", panel: "#121c21", surface: "#0f161a" },
  { id: "graphite", name: "Graphite", background: "#0b0b0c", panel: "#17171a", surface: "#101012" },
  { id: "obsidian", name: "Obsidian", background: "#0a0b0d", panel: "#121417", surface: "#0d0f12" },
  { id: "rust-ember", name: "Rust Ember", background: "#120c0b", panel: "#1f1512", surface: "#140f0e" },
  { id: "jade-night", name: "Jade Night", background: "#0a120f", panel: "#12201a", surface: "#0f1713" },
  { id: "ocean-ink", name: "Ocean Ink", background: "#0a1016", panel: "#121a26", surface: "#0f151d" },
  { id: "violet-ash", name: "Violet Ash", background: "#0f0c12", panel: "#191321", surface: "#130f16" },
  { id: "iron-wood", name: "Iron Wood", background: "#100f0b", panel: "#1b1912", surface: "#14130e" },
  { id: "storm-teal", name: "Storm Teal", background: "#0b1215", panel: "#122023", surface: "#0f171a" },
  { id: "midnight-brass", name: "Midnight Brass", background: "#11100b", panel: "#1d1a12", surface: "#15130e" },
  { id: "ash-spruce", name: "Ash Spruce", background: "#0b1212", panel: "#131f1f", surface: "#0f1717" },
  { id: "deep-maroon", name: "Deep Maroon", background: "#120b0e", panel: "#1e1316", surface: "#140f11" },
  { id: "shadow-indigo", name: "Shadow Indigo", background: "#0c0d14", panel: "#141621", surface: "#101117" },
  { id: "smoke-sand", name: "Smoke Sand", background: "#11100c", panel: "#1b1a13", surface: "#14130f" },
];

export const DEFAULT_THEME_ID = "noir-classic";
