import type { Collider } from "./world";
import { cameraFraction, rayFraction } from "./collision";
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
  // The indoor shell fades visually; its physical colliders still stop actors.
  return colliders.filter(
    (c) =>
      !c.id.startsWith("guard-") &&
      !(c.zone === 'office' && (c.id === 'desk' || c.id === 'chair')) &&
      !(c.zone === "office" && /^office-(back|front|west|east)$/.test(c.id)),
  );
}
export function cameraBoom(
  colliders: Collider[],
  target: { x: number; y: number; z: number },
  yaw: number,
  pitch: number,
  distance: number,
  avoidance?: { yaw: number | null },
) {
  const point = (p: number, angle=yaw) => ({
    x: target.x + Math.sin(angle) * Math.cos(p) * distance,
    y: target.y + Math.sin(p) * distance,
    z: target.z + Math.cos(angle) * Math.cos(p) * distance,
  });
  const aircraft=colliders.find(c=>c.id==='helicopter-cabin');
  const nearAircraft=aircraft && Math.abs(target.x-aircraft.x)<13 && Math.abs(target.z-aircraft.z)<18;
  const safetyVolumes=nearAircraft ? colliders.filter(c=>
    Math.abs(c.x-target.x)<(c.radius??(c.w??0)/2)+distance+1 &&
    Math.abs(c.z-target.z)<(c.radius??(c.d??0)/2)+distance+1) : colliders;
  const clearance=(candidate:typeof target)=>{
    const f=cameraFraction(colliders,target,candidate);
    if(!nearAircraft)return f;
    const endpoint={x:target.x+(candidate.x-target.x)*f,y:target.y+(candidate.y-target.y)*f,z:target.z+(candidate.z-target.z)*f};
    // Score the SAME near-plane safety pass that Runtime applies. A thin ray
    // alone can clear the roof/door while the camera volume still clips it.
    const final=constrainCamera(safetyVolumes,target,endpoint);
    return Math.min(f,Math.hypot(final.x-target.x,final.y-target.y,final.z-target.z)/distance);
  };
  let best = point(pitch), fraction = clearance(best);
  if(nearAircraft && (fraction*distance<3.5 || (avoidance?.yaw!==null && avoidance?.yaw!==undefined && fraction*distance<5.5))){
    const outward=Math.atan2(target.x-aircraft.x,target.z-aircraft.z);
    // Retain a safe side until the requested orbit is clearly free again.
    // Body-relative candidates do not flip left/right with tiny mouse changes.
    for(const angle of [avoidance?.yaw,outward,outward-.45,outward+.45]){
      if(angle===null||angle===undefined)continue;
      const candidate=point(Math.max(.35,pitch),angle);
      const f=clearance(candidate);
      if(f*distance>=4){best=candidate;fraction=f;if(avoidance)avoidance.yaw=angle;break;}
    }
  } else if(avoidance) avoidance.yaw=null;
  // Lift over low furniture before forcing a very close camera. Walls still win.
  if (fraction * distance < 4) {
    for (const extra of [0.25, 0.5]) {
      const candidate = point(Math.min(1.1, pitch + extra));
      const f = clearance(candidate);
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

/** Camera near-plane volume, applied AFTER smoothing so interpolation cannot cut corners. */
export function constrainCamera(
  colliders: Collider[],
  anchor: { x: number; y: number; z: number },
  wanted: { x: number; y: number; z: number },
  padding = 0.45,
) {
  const inside = (c: Collider, p: typeof anchor) =>
    p.y > (c.bottom ?? 0) - padding &&
    p.y < c.top + padding &&
    (c.radius !== undefined
      ? Math.hypot(p.x - c.x, p.z - c.z) < c.radius + padding
      : Math.abs(p.x - c.x) < (c.w ?? 0) / 2 + padding &&
        Math.abs(p.z - c.z) < (c.d ?? 0) / 2 + padding);
  let fraction = 1;
  for (const c of colliders) {
    // A cinematic may look AT an aircraft's center; only the camera must be outside.
    if (inside(c, anchor)) continue;
    const t = rayFraction(c, anchor, wanted, padding);
    if (t !== null) fraction = Math.min(fraction, Math.max(0, t - 0.002));
  }
  const p = {
    x: anchor.x + (wanted.x - anchor.x) * fraction,
    y: anchor.y + (wanted.y - anchor.y) * fraction,
    z: anchor.z + (wanted.z - anchor.z) * fraction,
  };
  // Resolve initial overlap too (moving objects, teleports, or a focus inside furniture).
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const c of colliders)
      if (inside(c, p)) {
        const low = (c.bottom ?? 0) - padding - 0.01,
          high = c.top + padding + 0.01;
        const moves: { axis: "x" | "y" | "z"; value: number }[] = [
          { axis: "y", value: low },
          { axis: "y", value: high },
        ];
        if (c.radius === undefined) {
          moves.push(
            { axis: "x", value: c.x - (c.w ?? 0) / 2 - padding - 0.01 },
            { axis: "x", value: c.x + (c.w ?? 0) / 2 + padding + 0.01 },
            { axis: "z", value: c.z - (c.d ?? 0) / 2 - padding - 0.01 },
            { axis: "z", value: c.z + (c.d ?? 0) / 2 + padding + 0.01 },
          );
        }
        const best = moves
          .filter((m) => m.axis !== "y" || m.value >= padding)
          .sort(
            (a, b) =>
              Math.abs(a.value - p[a.axis]) - Math.abs(b.value - p[b.axis]),
          )[0];
        const distance = Math.hypot(p.x - c.x, p.z - c.z),
          radial = (c.radius ?? Infinity) + padding + 0.01 - distance;
        if (
          c.radius !== undefined &&
          radial < Math.abs(best.value - p[best.axis])
        ) {
          p.x =
            c.x +
            (distance > 0.001 ? (p.x - c.x) / distance : 1) *
              (c.radius + padding + 0.01);
          p.z =
            c.z +
            (distance > 0.001 ? (p.z - c.z) / distance : 0) *
              (c.radius + padding + 0.01);
        } else p[best.axis] = best.value;
        changed = true;
      }
    if (!changed) break;
  }
  p.y = Math.max(padding, p.y);
  return p;
}
