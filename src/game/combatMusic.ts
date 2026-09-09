import type { Phase } from "./simulation";
/** Keep tension for five seconds after losing sight, without changing AI state. */
export function combatMusicHold(
  previous: number,
  delta: number,
  phase: Phase,
  grounds: boolean,
  threat: boolean,
) {
  if (
    !grounds ||
    phase === "title" ||
    phase === "intro" ||
    phase === "won" ||
    phase === "lost" ||
    phase === "dying"
  )
    return 0;
  if (phase !== "playing") return previous;
  return threat ? 5 : Math.max(0, previous - Math.max(0, delta));
}
export function musicTrack(phase: Phase, battle: boolean) {
  return phase === "title" ? 0 : phase === "intro" ? 3 : battle ? 2 : 1;
}
