export const BOSS_SLAM = {
  forward: 3, side: -1.652, radius: 2.65,
  windup: 1.1, enragedWindup: .95, commit: .4, swing: .18,
  recover: 1.3, enragedRecover: 1.1,
  stun: .95,
} as const;

/** Sagittal two-bone solve. The extended lower segment includes the downward
 * hammer; all lengths are in the GLB's unscaled joint coordinates. */
export function hammerContactAngles(y: number, z: number) {
  const upper = .52, lower = Math.hypot(1.83, .18);
  const distance = Math.max(Math.abs(lower - upper) + .001, Math.min(upper + lower - .001, Math.hypot(y, z)));
  const bend = -Math.acos(Math.max(-1, Math.min(1, (distance ** 2 - upper ** 2 - lower ** 2) / (2 * upper * lower))));
  const shoulder = Math.atan2(-z, -y) - Math.atan2(lower * Math.sin(bend), upper + lower * Math.cos(bend));
  return { shoulder, elbow: bend + Math.atan2(.18, 1.83) };
}
