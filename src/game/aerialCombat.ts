export type AerialAttack = "jumpSlash" | "flyingKick";
export const AERIAL = {
  jumpSlash: { duration: 0.64, hit: 0.24, cost: 14, damage: 1.5, range: 2.9, stun: 0.85, push: 3.2, stop: 0.09, impact: 0.9 },
  flyingKick: { duration: 0.56, hit: 0.18, cost: 10, damage: 0.75, range: 2.3, stun: 0.6, push: 2.8, stop: 0.075, impact: 0.75 },
} as const;
export function aerialPose(kind: AerialAttack, elapsed: number) {
  const spec = AERIAL[kind];
  const t = Math.max(0, Math.min(1, (elapsed - spec.hit + 0.1) / 0.15));
  const strike = t * t * (3 - 2 * t);
  const recover = Math.max(0, Math.min(1, (elapsed - spec.hit - 0.08) / (spec.duration - spec.hit - 0.08)));
  return { strike: strike * (1 - recover), load: 1 - strike, recover };
}
