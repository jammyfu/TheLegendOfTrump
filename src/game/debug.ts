export interface DebugOptions {
  enabled: boolean;
  boss: boolean;
  invincible: boolean;
  equipment: boolean;
  noMinions: boolean;
  noGuards: boolean;
  bossHp: number | null;
}

const enabled = (value: string | null) =>
  value === "1" || value === "true" || value === "on";

/** Parse URL switches without reading browser globals, so tests can cover them. */
export function parseDebugOptions(search: string): DebugOptions {
  const params = new URLSearchParams(search);
  const modes = new Set(
    (params.get("debug") ?? "")
      .split(",")
      .map((mode) => mode.trim().toLowerCase())
      .filter(Boolean),
  );
  const boss =
    modes.has("boss") ||
    modes.has("office") ||
    modes.has("all") ||
    enabled(params.get("boss"));
  const invincible =
    modes.has("god") ||
    modes.has("all") ||
    enabled(params.get("god")) ||
    enabled(params.get("invincible"));
  const equipment =
    boss || modes.has("kit") || modes.has("all") || enabled(params.get("kit"));
  const rawBossHp = Number(params.get("bossHp"));
  const bossHp =
    Number.isFinite(rawBossHp) && rawBossHp >= 1
      ? Math.min(99, Math.round(rawBossHp))
      : null;
  return {
    enabled:
      params.has('debug') || modes.size > 0 ||
      ["boss", "god", "invincible", "kit", "noMinions", "noGuards", "bossHp"].some((key) => params.has(key)),
    boss,
    invincible,
    equipment,
    noMinions: modes.has("solo") || enabled(params.get("noMinions")),
    noGuards: enabled(params.get("noGuards")),
    bossHp,
  };
}

export const debugOptions = parseDebugOptions(
  typeof window === "undefined" ? "" : window.location.search,
);
