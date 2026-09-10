import { LANDING } from "./expedition";
/** Shared deterministic timeline: rendering never changes the player's physics state. */
export const INTRO_DURATION = 11;
const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function introPose(remaining: number) {
  const elapsed = INTRO_DURATION - Math.max(0, remaining);
  // Preserve landing/disembarkation and the short camera handoff.
  const t = elapsed <= 9 ? elapsed : 9 + (elapsed - 9) * 4.5;
  const arrival = smooth(t / 5.5),
    exit = smooth((t - 6.5) / 2.5);
  // Nose points along local +Z. First approach northward, then yaw toward the pad.
  let helicopter: [number, number, number] = [
    LANDING.x - 22 * (1 - arrival) ** 2,
    mix(42, 0.1, arrival),
    LANDING.z + 100 * (1 - arrival),
  ];
  let heading = Math.PI + Math.atan2(-0.44 * (1 - arrival), 1);
  let bank = Math.sin((t / 5.5) * Math.PI) * 0.055;
  let pitch = 0.065 * Math.sin((t / 5.5) * Math.PI);
  if (t >= 5.5) {
    heading = Math.PI;
    bank = 0;
    pitch = 0;
  }
  const hero: [number, number, number] = [
    mix(LANDING.x - 2.45, LANDING.heroX, exit),
    mix(0.9, 0, smooth((t - 6.5) / 0.9)),
    mix(LANDING.z - 0.7, LANDING.heroZ, exit),
  ];
  let camera: [number, number, number], target: [number, number, number];
  if (t < 5.5) {
    camera = [helicopter[0] - 14, helicopter[1] + 7, helicopter[2] + 20];
    target = [helicopter[0], helicopter[1] + 1.5, helicopter[2]];
  } else if (elapsed < 9) {
    camera = [LANDING.x - 14, 8, LANDING.z + 16];
    target = [LANDING.x - 3, 2.3, LANDING.z - 2];
  } else {
    // Deliberate fixed-shot cut: never orbit/blend through the rotor on handoff.
    camera = [
      LANDING.heroX,
      3.8016210114,
      LANDING.heroZ + 7.770703799,
    ];
    target = [LANDING.heroX, 1.9, LANDING.heroZ];
  }
  return {
    t,
    helicopter,
    rotorSpeed: 1-smooth((elapsed-9)/2),
    heading,
    bank,
    pitch,
    hero,
    heroHeading: Math.atan2(
      LANDING.heroX - (LANDING.x - 2.45),
      LANDING.heroZ - (LANDING.z - 0.7),
    ),
    camera,
    target,
    door: smooth((t - 5.5) / 0.6) * (1 - smooth((t - 9.45) / 0.55)),
    stairs: smooth((t - 5.85) / 0.6) * (1 - smooth((t - 9) / 0.45)),
    walking: t >= 6.5 && t < 9,
    visible: t >= 6.5,
  };
}
