type Point = { x: number; y: number; z: number };
export type CutawayBounds = { min: Point; max: Point };
export type CutawaySide = "east" | "west" | "front" | "back" | "ceiling";

/** Blender appends .001; GLTFLoader may sanitize that to 001. */
export function cutawaySide(name: string): CutawaySide | undefined {
  return /^OfficeCutaway_(east|west|front|back|ceiling)(?:[._]?\d+)*$/.exec(name)?.[1] as
    CutawaySide | undefined;
}

/** Expanded segment/box test accounts for shoulders and the camera near plane. */
export function obscuresSubject(
  bounds: CutawayBounds,
  camera: Point,
  subject: Point,
  padding = 0.55,
  side?: CutawaySide,
) {
  // Trim can protrude into the character's padding. A wall behind the subject
  // must still restore when the camera turns back into the room.
  if (side) {
    const axis =
      side === "ceiling" ? "y" : side === "east" || side === "west" ? "x" : "z";
    const sign = side === "west" || side === "back" ? -1 : 1;
    if ((camera[axis] - subject[axis]) * sign <= 0.25) return false;
  }
  let near = 0,
    far = 1;
  for (const axis of ["x", "y", "z"] as const) {
    const direction = subject[axis] - camera[axis];
    const low = bounds.min[axis] - padding,
      high = bounds.max[axis] + padding;
    if (Math.abs(direction) < 1e-8) {
      if (camera[axis] < low || camera[axis] > high) return false;
      continue;
    }
    const a = (low - camera[axis]) / direction,
      b = (high - camera[axis]) / direction;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return false;
  }
  return far >= 0 && near < 0.98;
}

export function cutawayFade(
  opacity: number,
  hold: number,
  obstructed: boolean,
  dt: number,
) {
  const remaining = obstructed ? 0.35 : Math.max(0, hold - dt);
  const target = remaining > 0 ? 0 : 1;
  return {
    hold: remaining,
    opacity:
      opacity +
      (target - opacity) * (1 - Math.exp(-dt * (target === 0 ? 18 : 5))),
  };
}
