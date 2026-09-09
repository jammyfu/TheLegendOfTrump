/** Fists have their own cadence and contact frames; damage stays below a sword. */
export const UNARMED = [
  {
    duration: 0.34,
    hit: 0.11,
    damage: 0.25,
    range: 1.65,
    stun: 0.26,
    push: 0.65,
    stop: 0.045,
    impact: 0.42,
    chain: 0.12,
  },
  {
    duration: 0.4,
    hit: 0.15,
    damage: 0.25,
    range: 1.8,
    stun: 0.34,
    push: 0.85,
    stop: 0.06,
    impact: 0.58,
    chain: 0.14,
  },
  {
    duration: 0.56,
    hit: 0.23,
    damage: 0.5,
    range: 2.05,
    stun: 0.52,
    push: 1.8,
    stop: 0.085,
    impact: 0.78,
    chain: 0,
  },
] as const;
const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
/** Load → explosive extension → brief contact pose → controlled return. */
export function unarmedPose(stage: number, elapsed: number) {
  const spec = UNARMED[stage];
  const launch = spec.hit - 0.055,
    settle = spec.hit + 0.035;
  const load =
    elapsed < launch
      ? smooth(elapsed / launch)
      : 1 - smooth((elapsed - launch) / 0.055);
  const strike =
    elapsed < spec.hit
      ? smooth((elapsed - launch) / 0.055)
      : 1 - smooth((elapsed - settle) / (spec.duration - settle));
  const side = stage === 0 ? -1 : 1;
  const kick = stage === 2;
  return {
    load,
    strike,
    shoulder: -0.65 + load * 0.34 - strike * 1.02,
    shoulderYaw: side * (load * 0.16 - strike * 0.22),
    elbow: -1.15 - load * 0.26 + strike * 1.11,
    waistYaw: kick
      ? -0.18 * load + 0.28 * strike
      : side * (-0.3 * load + (stage === 1 ? 0.66 : 0.46) * strike),
    waistPitch: kick
      ? 0.12 * load - 0.24 * strike
      : -0.07 * load + 0.18 * strike,
    waistRoll: kick ? -0.1 * strike : side * 0.07 * strike,
    frontLeg: kick ? -0.5 * load - 1.55 * strike : -0.22 * strike,
    backLeg: 0.2 * load + 0.2 * strike,
    knee: kick ? 0.85 * load + 0.1 * strike : 0.2 + 0.16 * load,
    bob: -0.065 * load + (kick ? 0.035 : -0.025) * strike,
  };
}
