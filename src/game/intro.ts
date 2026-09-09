/** Shared deterministic timeline: rendering never changes the player's physics state. */
export const INTRO_DURATION = 15;
const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function introPose(remaining: number) {
  const t = INTRO_DURATION - Math.max(0, remaining);
  const arrival = smooth(t / 5.5),
    exit = smooth((t - 6.5) / 2.5),
    departure = smooth((t - 10) / 5);
  const helicopter: [number, number, number] = [
    mix(-32, -8, arrival) - departure * 25,
    mix(19, 0.1, arrival) + departure * 24,
    mix(-16, 18, arrival) - departure * 22,
  ];
  const hero: [number, number, number] = [
    mix(-5.55, 0, exit),
    mix(0.9, 0, smooth((t - 6.5) / 0.9)),
    mix(18.7, 15, exit),
  ];
  let camera: [number, number, number], target: [number, number, number];
  if (t < 5.5) {
    camera = [helicopter[0] + 14, helicopter[1] + 7, helicopter[2] + 20];
    target = [helicopter[0], helicopter[1] + 1.5, helicopter[2]];
  } else if (t < 9) {
    camera = [6, 8, 34];
    target = [-5, 2.3, 16];
  } else {
    const q = smooth((t - 9) / 6);
    const angle = mix(1.05, 0, q);
    camera = [
      Math.sin(angle) * 8,
      mix(3.7, 3.8016210114, q),
      15 + Math.cos(angle) * 7.770703799,
    ];
    target = [0, 1.9, 15];
  }
  return {
    t,
    helicopter,
    hero,
    camera,
    target,
    door: smooth((t - 5.5) / 0.6) * (1 - smooth((t - 9.45) / 0.55)),
    stairs: smooth((t - 5.85) / 0.6) * (1 - smooth((t - 9) / 0.45)),
    walking: t >= 6.5 && t < 9,
    visible: t >= 6.5,
  };
}
