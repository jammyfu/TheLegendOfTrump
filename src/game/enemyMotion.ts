import { moveAndSlide } from "./collision";
import type { Collider } from "./world";
export const DEATH = { enemy: 2.4, boss: 3, player: 2.6, fall: 0.7, fade: 0.7 };
export function deathPose(remaining: number, duration: number) {
  const age = Math.max(0, duration - remaining);
  const t = Math.min(1, age / DEATH.fall);
  return {
    fall: t * t * (3 - 2 * t),
    opacity: Math.min(1, Math.max(0, remaining / DEATH.fade)),
  };
}
/** Local obstacle steering; only try side steps when the direct step stalls. */
export function steerEnemy(
  colliders: Collider[],
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius: number,
  side: number,
) {
  const direct = moveAndSlide(colliders, x, z, 0, dx, dz, false, radius);
  const distance = Math.hypot(dx, dz);
  if (
    distance < 0.0001 ||
    Math.hypot(direct.x - x, direct.z - z) > distance * 0.6
  )
    return direct;
  let best = direct,
    score = 0;
  for (const angle of [side * 0.8, side * 1.4, -side * 0.8, -side * 1.4]) {
    const c = Math.cos(angle),
      s = Math.sin(angle);
    const candidate = moveAndSlide(
      colliders,
      x,
      z,
      0,
      dx * c - dz * s,
      dx * s + dz * c,
      false,
      radius,
    );
    const progress = Math.hypot(candidate.x - x, candidate.z - z);
    if (progress > score + 0.001) {
      score = progress;
      best = candidate;
    }
  }
  return best;
}
