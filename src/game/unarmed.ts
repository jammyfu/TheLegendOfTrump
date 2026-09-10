/** Fists have their own cadence and contact frames; damage stays below a sword. */
export const UNARMED = [
  {
    duration: 0.34,
    hit: 0.11,
    damage: 0.25,
    range: 1.65,
    stun: 0.14,
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
    stun: 0.18,
    push: 0.85,
    stop: 0.06,
    impact: 0.58,
    chain: 0.14,
  },
  {
    duration: 0.56,
    hit: 0.23,
    damage: 0.35,
    range: 2.05,
    stun: 0.3,
    push: 1.8,
    stop: 0.085,
    impact: 0.78,
    chain: 0,
  },
] as const;

/** A fully held bare-knuckle strike trades time and stamina for a decisive hit. */
export const HEAVY_PUNCH_STAGE = 3;
export const HEAVY_PUNCH = {
  duration: 0.78,
  hit: 0.4,
  damage: 1.25,
  range: 2.35,
  stun: 0.72,
  push: 4.6,
  stop: 0.14,
  impact: 1.45,
  charge: 0.65,
  /** Only spend endurance after the fist is already fully charged. */
  fullChargeDrain: 12,
} as const;
const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};

/** The held pose is deliberately deep: it must read as a committed wind-up. */
export function heavyPunchChargePose(elapsed: number) {
  const load = smooth(elapsed / HEAVY_PUNCH.charge);
  return {
    load,
    strike: 0,
    shoulder: -0.66 - load * 1.02,
    shoulderYaw: 0.18 + load * 0.2,
    elbow: -1.08 - load * 0.46,
    waistYaw: -0.18 * load,
    waistPitch: -0.5 * load,
    waistRoll: 0.08 * load,
    frontLeg: -0.18 * load,
    backLeg: 0.3 * load,
    knee: 0.22 + 0.34 * load,
    bob: -0.09 * load,
  };
}

/** Release from the lean into one short, high-impact forward extension. */
export function heavyPunchPose(elapsed: number) {
  const launch = HEAVY_PUNCH.hit - 0.1;
  const recover = HEAVY_PUNCH.hit + 0.09;
  const load =
    elapsed < launch
      ? smooth(elapsed / launch)
      : 1 - smooth((elapsed - launch) / 0.1);
  const strike =
    elapsed < HEAVY_PUNCH.hit
      ? smooth((elapsed - launch) / 0.1)
      : 1 - smooth((elapsed - recover) / (HEAVY_PUNCH.duration - recover));
  return {
    load,
    strike,
    shoulder: -1.68 + load * 0.24 - strike * 1.15,
    shoulderYaw: 0.38 * load - 0.26 * strike,
    elbow: -1.54 - load * 0.1 + strike * 1.36,
    waistYaw: -0.18 * load + 0.42 * strike,
    waistPitch: -0.5 * load + 0.62 * strike,
    waistRoll: 0.08 * load - 0.12 * strike,
    frontLeg: -0.16 * load - 0.28 * strike,
    backLeg: 0.3 * load + 0.16 * strike,
    knee: 0.56 * load + 0.08,
    bob: -0.09 * load + 0.045 * strike,
  };
}
/** Load → explosive extension → brief contact pose → controlled return. */
export function unarmedPose(stage: number, elapsed: number) {
  if (stage === HEAVY_PUNCH_STAGE) return heavyPunchChargePose(elapsed);
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
