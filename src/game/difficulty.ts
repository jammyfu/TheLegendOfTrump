import { ENEMY_SPAWNS, FIELD_CHESTS } from "./expedition";
export type Difficulty = "normal" | "hard";
export function savedDifficulty(): Difficulty | null {
  try {
    const value = localStorage.getItem("legend-difficulty");
    return value === "normal" || value === "hard" ? value : null;
  } catch { return null; }
}
export function saveDifficulty(value: Difficulty) {
  try { localStorage.setItem("legend-difficulty", value); } catch { /* Use session preference. */ }
}
export function campaignCompleted() {
  try { return localStorage.getItem("legend-campaign-completed") === "1"; }
  catch { return false; }
}
export function saveCampaignCompletion() {
  try { localStorage.setItem("legend-campaign-completed", "1"); } catch { /* Session still unlocks hard. */ }
}
export function difficultySpawns(difficulty: Difficulty): typeof ENEMY_SPAWNS {
  if (difficulty === "hard") return ENEMY_SPAWNS.flatMap((spawn, index) => [
    { ...spawn },
    ...(index % 2 === 0 ? [{ x: spawn.x + 4, z: spawn.z + 3,
      kind: index % 4 === 0 ? "archer" as const : "sentinel" as const }] : []),
  ]);
  const shrines = FIELD_CHESTS.filter(c => c.id === "chest-sword" || c.id === "chest-shield");
  return [
    ...ENEMY_SPAWNS.filter(s => !shrines.some(c => Math.hypot(s.x-c.x,s.z-c.z)<16)),
    ...shrines.map(c => ({ x: c.x + (c.x < 0 ? 6 : -6), z: c.z + 2,
      kind: "sentinel" as const })),
  ];
}
