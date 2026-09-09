import { moveAndSlide } from "./collision";
import type { Collider } from "./world";
import type { EnemyKind } from "./expedition";
export const DEATH = { enemy: 2.4, boss: 3, player: 2.6, fall: 0.7, fade: 0.7 };
export const ENEMY_RECOVERY: Record<EnemyKind, number> = {
  sentinel: 0.55,
  archer: 0.42,
  brute: 0.82,
};
type Rotation = [number, number, number];
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Keeps anticipation, impact and recovery on the same timeline as enemy damage. */
export function enemyAttackPose(
  kind: EnemyKind,
  windupRemaining: number,
  windupDuration: number,
  recoveryRemaining: number,
) {
  const swingDuration = kind === "brute" ? 0.24 : 0.16;
  const windup = smooth(
    (windupDuration - windupRemaining) /
      Math.max(0.001, windupDuration - swingDuration),
  );
  const recoveryDuration = ENEMY_RECOVERY[kind];
  const recoveryElapsed = recoveryDuration - recoveryRemaining;
  const strike =
    windupRemaining > 0
      ? smooth(1 - windupRemaining / swingDuration)
      : recoveryRemaining > 0
        ? 1
        : 0;
  const settle = 1 - smooth(Math.max(0, recoveryElapsed) / recoveryDuration);
  const active =
    windupRemaining > 0
      ? windup * (1 - (kind === "archer" ? 0 : strike))
      : recoveryRemaining > 0
        ? 0
        : 0;
  const after =
    windupRemaining > 0 ? strike : recoveryRemaining > 0 ? settle : 0;

  if (kind === "archer")
    return {
      torso: [0, -0.14 * active, 0] as Rotation,
      rightArm: [-0.45 - 1.05 * active, -0.72 * active, 0.08] as Rotation,
      rightElbow: [-0.3 - 1.05 * active, 0, 0] as Rotation,
      leftArm: [-0.4 - 1.15 * active, -0.18, -0.16] as Rotation,
      leftElbow: [-0.2, 0, 0] as Rotation,
      weapon: [0, 0, 0] as Rotation,
    };

  const heavy = kind === "brute";
  return {
    torso: [
      after * (heavy ? 0.32 : 0.18),
      active * (heavy ? -0.28 : -0.5) + after * (heavy ? 0.18 : 0.7),
      active * (heavy ? -0.06 : -0.1),
    ] as Rotation,
    rightArm: [
      -0.18 - active * (heavy ? 2.3 : 1.72) - after * (heavy ? 0.7 : 0.85),
      heavy ? 0 : -0.18 * active,
      -0.08 - active * (heavy ? 0.2 : 0.42),
    ] as Rotation,
    rightElbow: [
      -0.2 - active * (heavy ? 0.78 : 0.48) + after * 0.1,
      0,
      0,
    ] as Rotation,
    leftArm: [-0.38 - active * 0.18, 0, 0.24] as Rotation,
    leftElbow: [-0.38, 0, 0] as Rotation,
    // +Y blade rotated toward +Z, accounting for the shoulder/elbow chain.
    weapon: [
      active * (heavy ? 3.0 : 2.1) + after * (heavy ? 2.6 : 2.5),
      0,
      0,
    ] as Rotation,
  };
}
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
