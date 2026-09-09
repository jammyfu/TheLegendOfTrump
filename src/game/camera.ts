import type { Collider } from "./world";
import { cameraFraction } from "./collision";
export const DEFAULT_CAMERA = {
  distance: 9.5,
  fov: 60,
  sensitivity: 1,
  invertY: false,
  shake: true,
};
export type CameraSettings = typeof DEFAULT_CAMERA;
const key = "trump-camera-v1";
export function sanitizeCamera(value: Partial<CameraSettings>): CameraSettings {
  const number = (v: unknown, fallback: number, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.max(min, Math.min(max, v))
      : fallback;
  return {
    distance: number(value.distance, 9.5, 5, 14),
    fov: number(value.fov, 60, 55, 80),
    sensitivity: number(value.sensitivity, 1, 0.4, 2),
    invertY: typeof value.invertY === "boolean" ? value.invertY : false,
    shake: typeof value.shake === "boolean" ? value.shake : true,
  };
}
export function loadCamera(): CameraSettings {
  if (typeof window === "undefined") return { ...DEFAULT_CAMERA };
  try {
    return sanitizeCamera(JSON.parse(localStorage.getItem(key) ?? "{}") ?? {});
  } catch {
    return { ...DEFAULT_CAMERA };
  }
}
export function saveCamera(settings: CameraSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
}
/** Preserve horizontal context on portrait displays, without changing desktop FOV. */
export function responsiveFov(vertical: number, aspect: number) {
  const portrait =
    (2 *
      Math.atan(Math.tan((25 * Math.PI) / 180) / Math.max(0.25, aspect)) *
      180) /
    Math.PI;
  return Math.min(105, Math.max(vertical, portrait));
}
export function cameraObstacles(colliders: Collider[]) {
  // Enemies must not push the view into the player during close combat.
  return colliders.filter((c) => !c.id.startsWith("guard-"));
}
export function cameraBoom(
  colliders: Collider[],
  target: { x: number; y: number; z: number },
  yaw: number,
  pitch: number,
  distance: number,
) {
  const point = (p: number) => ({
    x: target.x + Math.sin(yaw) * Math.cos(p) * distance,
    y: target.y + Math.sin(p) * distance,
    z: target.z + Math.cos(yaw) * Math.cos(p) * distance,
  });
  let best = point(pitch),
    fraction = cameraFraction(colliders, target, best);
  // Lift over low furniture before forcing a very close camera. Walls still win.
  if (fraction * distance < 4) {
    for (const extra of [0.25, 0.5]) {
      const candidate = point(Math.min(1.1, pitch + extra));
      const f = cameraFraction(colliders, target, candidate);
      if (f > fraction + 0.08) {
        best = candidate;
        fraction = f;
      }
    }
  }
  return {
    direction: {
      x: (best.x - target.x) / distance,
      y: (best.y - target.y) / distance,
      z: (best.z - target.z) / distance,
    },
    distance: distance * fraction,
  };
}
export function recoverBoom(current: number, safe: number, dt: number) {
  return safe < current
    ? safe
    : current + (safe - current) * (1 - Math.exp(-Math.max(0, dt) * 4.5));
}

/** Lead the indoor view into the arena, keeping the hero below its center. */
export function indoorFrame(
  player: { x: number; y: number; z: number },
  yaw: number,
  pitch: number,
  distance: number,
  boss?: { x: number; z: number },
) {
  let dx = -Math.sin(yaw) * 1.8,
    dz = -Math.cos(yaw) * 1.8;
  if (boss) {
    dx = boss.x - player.x;
    dz = boss.z - player.z;
    const lead = Math.min(0.4, 2.8 / Math.max(0.001, Math.hypot(dx, dz)));
    dx *= lead;
    dz *= lead;
  }
  return {
    target: { x: player.x + dx, y: player.y + 2.3, z: player.z + dz },
    pitch: Math.max(0.18, Math.min(0.85, pitch)),
    distance: distance + 1.5,
  };
}
