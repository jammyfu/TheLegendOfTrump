import type { Collider } from "./world";
export const PLAYER_RADIUS = 0.38,
  PLAYER_HEIGHT = 2.85;
export function overlaps(c: Collider, x: number, z: number, r = PLAYER_RADIUS) {
  if (c.radius !== undefined)
    return Math.hypot(x - c.x, z - c.z) < c.radius + r - 1e-5;
  const dx = Math.max(Math.abs(x - c.x) - (c.w ?? 0) / 2, 0),
    dz = Math.max(Math.abs(z - c.z) - (c.d ?? 0) / 2, 0);
  return dx * dx + dz * dz < r * r - 1e-6;
}
export function occupied(
  colliders: Collider[],
  x: number,
  z: number,
  y: number,
  r = PLAYER_RADIUS,
) {
  return colliders.some(
    (c) =>
      y + PLAYER_HEIGHT > (c.bottom ?? 0) + 0.01 &&
      y < c.top - 0.025 &&
      overlaps(c, x, z, r),
  );
}
export function floorAt(
  colliders: Collider[],
  x: number,
  z: number,
  ceiling: number,
  radius = 0.18,
) {
  let floor = 0;
  for (const c of colliders)
    if (c.walkable && c.top <= ceiling + 0.015 && overlaps(c, x, z, radius))
      floor = Math.max(floor, c.top);
  return floor;
}
/** Sweep the entire body vertically, including props that cannot be auto-stepped. */
export function moveVertical(
  colliders: Collider[],
  x: number,
  z: number,
  y: number,
  targetY: number,
) {
  let nextY = targetY;
  if (targetY > y) {
    for (const c of colliders) {
      const underside = c.bottom ?? 0;
      if (
        underside >= y + PLAYER_HEIGHT - 0.01 &&
        underside < nextY + PLAYER_HEIGHT &&
        overlaps(c, x, z)
      )
        nextY = Math.max(y, underside - PLAYER_HEIGHT);
    }
    return { y: nextY, grounded: false, hitCeiling: nextY < targetY };
  }
  let floor = 0;
  for (const c of colliders)
    if (!c.id.startsWith("guard-") && c.top <= y + 0.015 && overlaps(c, x, z)) floor = Math.max(floor, c.top);
  return {
    y: Math.max(floor, nextY),
    grounded: nextY <= floor,
    hitCeiling: false,
  };
}
export function moveAndSlide(
  colliders: Collider[],
  x: number,
  z: number,
  y: number,
  dx: number,
  dz: number,
  step: boolean,
  radius = PLAYER_RADIUS,
) {
  // Recover existing overlaps (moving enemies, knockback, corner contacts).
  // Enemy heads are rounded bodies, not standing platforms.
  for (let pass = 0; pass < 12; pass++) {
    let corrected = false;
    for (const c of colliders) {
      if (y + PLAYER_HEIGHT <= (c.bottom ?? 0) + 0.01 ||
          y >= c.top + (c.id.startsWith("guard-") ? 0.08 : -0.025) ||
          !overlaps(c, x, z, radius)) continue;
      if (c.radius !== undefined) {
        const ox = x - c.x, oz = z - c.z;
        const distance = Math.hypot(ox, oz);
        const push = c.radius + radius + 0.002 - distance;
        x += (distance > 1e-6 ? ox / distance : 1) * push;
        z += (distance > 1e-6 ? oz / distance : 0) * push;
      } else {
        const halfX = (c.w ?? 0) / 2, halfZ = (c.d ?? 0) / 2;
        const qx = Math.max(c.x - halfX, Math.min(x, c.x + halfX));
        const qz = Math.max(c.z - halfZ, Math.min(z, c.z + halfZ));
        const ox = x - qx, oz = z - qz, distance = Math.hypot(ox, oz);
        if (distance > 1e-6) {
          x += ox / distance * (radius + 0.002 - distance);
          z += oz / distance * (radius + 0.002 - distance);
        } else {
          const pushX = halfX + radius + 0.002 - Math.abs(x - c.x);
          const pushZ = halfZ + radius + 0.002 - Math.abs(z - c.z);
          if (pushX < pushZ) x += (x >= c.x ? 1 : -1) * pushX;
          else z += (z >= c.z ? 1 : -1) * pushZ;
        }
      }
      corrected = true;
    }
    if (!corrected) break;
  }
  // Conservative swept bounds: keep every obstacle any substep can reach,
  // then run the same precise circle/box checks against this small local set.
  const minX = Math.min(x, x + dx) - radius,
    maxX = Math.max(x, x + dx) + radius,
    minZ = Math.min(z, z + dz) - radius,
    maxZ = Math.max(z, z + dz) + radius;
  colliders = colliders.filter((c) => {
    const halfX = c.radius ?? (c.w ?? 0) / 2,
      halfZ = c.radius ?? (c.d ?? 0) / 2;
    return (
      c.x + halfX >= minX &&
      c.x - halfX <= maxX &&
      c.z + halfZ >= minZ &&
      c.z - halfZ <= maxZ
    );
  });
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  let height = y;
  for (let i = 0; i < count; i++) {
    const nx = x + dx / count,
      nz = z + dz / count;
    const nextFloor = step
      ? floorAt(colliders, nx, nz, height + 0.26, radius)
      : height;
    const ny = Math.max(height, nextFloor);
    if (!occupied(colliders, nx, nz, ny, radius)) {
      x = nx;
      z = nz;
      height = ny;
      continue;
    }
    if (!occupied(colliders, nx, z, height, radius)) x = nx;
    if (!occupied(colliders, x, nz, height, radius)) z = nz;
  }
  return { x, z, y: height };
}
/** Slab/cylinder intersection, shared by interaction LOS and the camera boom. */
export function rayFraction(
  c: Collider,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  padding = 0,
) {
  let lo = 0,
    hi = 1;
  const dx = to.x - from.x,
    dy = to.y - from.y,
    dz = to.z - from.z;
  const slab = (start: number, dir: number, min: number, max: number) => {
    if (Math.abs(dir) < 1e-8) return start >= min && start <= max;
    let a = (min - start) / dir,
      b = (max - start) / dir;
    if (a > b) [a, b] = [b, a];
    lo = Math.max(lo, a);
    hi = Math.min(hi, b);
    return lo <= hi;
  };
  if (!slab(from.y, dy, (c.bottom ?? 0) - padding, c.top + padding))
    return null;
  if (c.radius !== undefined) {
    const ox = from.x - c.x,
      oz = from.z - c.z,
      r = c.radius + padding,
      a = dx * dx + dz * dz,
      b = 2 * (ox * dx + oz * dz),
      cc = ox * ox + oz * oz - r * r;
    if (a < 1e-9) {
      if (cc > 0) return null;
    } else {
      const d = b * b - 4 * a * cc;
      if (d < 0) return null;
      lo = Math.max(lo, (-b - Math.sqrt(d)) / (2 * a));
      hi = Math.min(hi, (-b + Math.sqrt(d)) / (2 * a));
      if (lo > hi) return null;
    }
  } else if (
    !slab(
      from.x,
      dx,
      c.x - (c.w ?? 0) / 2 - padding,
      c.x + (c.w ?? 0) / 2 + padding,
    ) ||
    !slab(
      from.z,
      dz,
      c.z - (c.d ?? 0) / 2 - padding,
      c.z + (c.d ?? 0) / 2 + padding,
    )
  )
    return null;
  return lo >= 0 && lo <= 1 ? lo : null;
}
export function lineClear(
  colliders: Collider[],
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  ignore = "",
) {
  return !colliders.some(
    (c) => c.id !== ignore && rayFraction(c, from, to) !== null,
  );
}
export function cameraFraction(
  colliders: Collider[],
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
) {
  let fraction = 1;
  for (const c of colliders) {
    const t = rayFraction(c, from, to, 0.22);
    if (t !== null) fraction = Math.min(fraction, Math.max(0.025, t - 0.025));
  }
  return fraction;
}
