export interface AudioSettings {
  enabled: boolean;
  music: number;
  effects: number;
}
export function sanitizeAudio(value: Partial<AudioSettings>): AudioSettings {
  const volume = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n)
      ? Math.max(0, Math.min(1, n))
      : 1;
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : true,
    music: volume(value.music),
    effects: volume(value.effects),
  };
}
let settings: AudioSettings = { enabled: true, music: 1, effects: 1 };
try {
  settings = sanitizeAudio(
    JSON.parse(localStorage.getItem("legend-audio") || "{}") || {},
  );
} catch {
  /* Defaults for unavailable storage. */
}
export const getAudioSettings = () => settings;
export function saveAudioSettings(patch: Partial<AudioSettings>) {
  settings = sanitizeAudio({ ...settings, ...patch });
  try {
    localStorage.setItem("legend-audio", JSON.stringify(settings));
  } catch {
    /* Session controls remain available. */
  }
}
