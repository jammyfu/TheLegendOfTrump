/** Shared timings keep joint poses and damage on the same timeline. */
export const ATTACKS = [
  { name: "下劈", duration: 0.46, hit: 0.15, cost: 8, stun: 0.56, push: 1.8 },
  {
    name: "左 → 右横斩",
    duration: 0.5,
    hit: 0.19,
    cost: 9,
    stun: 0.6,
    push: 2.1,
  },
  {
    name: "右 → 左横斩",
    duration: 0.66,
    hit: 0.27,
    cost: 12,
    stun: 0.95,
    push: 4.2,
  },
] as const;
export const COMBO_GRACE = 0.34;
export type JointRotation = [number, number, number];
type Pose = {
  shoulder: JointRotation;
  elbow: JointRotation;
  wrist: JointRotation;
  waist: JointRotation;
};
const ready: Pose = {
  shoulder: [-0.6, 0, -0.15],
  elbow: [-0.65, 0, 0],
  wrist: [0, 0, 0],
  waist: [0, 0, 0],
};
const poses: [Pose, Pose][] = [
  [
    {
      shoulder: [-0.8, -0.6, -1.15],
      elbow: [-1, 0, 0],
      wrist: [0, 0.2, -0.25],
      waist: [0, -0.5, -0.08],
    },
    {
      shoulder: [-1.1, 0.65, 0.65],
      elbow: [-0.18, 0, 0],
      wrist: [0, -0.3, 0.2],
      waist: [0.08, 0.65, 0.08],
    },
  ],
  [
    {
      shoulder: [-1.15, 0.7, 0.75],
      elbow: [-0.85, 0, 0],
      wrist: [0, -0.4, 0.35],
      waist: [0, 0.5, 0.06],
    },
    {
      shoulder: [-0.75, -0.7, -1.1],
      elbow: [-0.12, 0, 0],
      wrist: [0, 0.35, -0.2],
      waist: [0.06, -0.65, -0.1],
    },
  ],
  [
    {
      shoulder: [-2.8, 0, -0.3],
      elbow: [-1.05, 0, 0],
      wrist: [-0.25, 0, 0],
      waist: [-0.16, -0.15, 0],
    },
    {
      shoulder: [-0.65, 0, 0.1],
      elbow: [-0.18, 0, 0],
      wrist: [0.3, 0, 0],
      waist: [0.36, 0.15, 0],
    },
  ],
];
export function attackPose(stage: number, elapsed: number): Pose {
  const spec = ATTACKS[stage],
    [windup, follow] = poses[[2, 1, 0][stage]];
  const impactEnd = spec.hit + 0.08;
  let a: Pose, b: Pose, t: number;
  if (elapsed < spec.hit - 0.055) {
    a = ready;
    b = windup;
    t = elapsed / (spec.hit - 0.055);
  } else if (elapsed < impactEnd) {
    a = windup;
    b = follow;
    t = (elapsed - spec.hit + 0.055) / 0.135;
  } else {
    a = follow;
    b = ready;
    t = (elapsed - impactEnd) / (spec.duration - impactEnd);
  }
  t = Math.max(0, Math.min(1, t));
  t = t * t * (3 - 2 * t);
  const blend = (key: keyof Pose) =>
    a[key].map((v, i) => v + (b[key][i] - v) * t) as JointRotation;
  return {
    shoulder: blend("shoulder"),
    elbow: blend("elbow"),
    wrist: blend("wrist"),
    waist: blend("waist"),
  };
}

export const SPIN = {
  minCharge: 1.2,
  maxCharge: 1.2,
  duration: 0.8,
  hit: 0.22,
  cost: 26,
  radius: 3.8,
};
export function swingProgress(stage: number, elapsed: number) {
  const t = Math.max(
    0,
    Math.min(1, (elapsed - ATTACKS[stage].hit + 0.055) / 0.135),
  );
  return t * t * (3 - 2 * t);
}
/** Blade direction in character space (+Z forward, +X character's left). */
export function bladeDirection(
  stage: number,
  elapsed: number,
): [number, number, number] {
  const t = swingProgress(stage, elapsed);
  const direction: [number, number, number] =
    stage === 0
      ? [0, 1 - t * 1.8, 0.25 + t * 0.75]
      : [
          (stage === 1 ? 1 : -1) * (1 - 2 * t),
          0.08,
          0.45 + Math.sin(t * Math.PI) * 0.5,
        ];
  const spec = ATTACKS[stage];
  const recovery = Math.max(
    0,
    Math.min(
      1,
      (elapsed - spec.hit - 0.08) / (spec.duration - spec.hit - 0.08),
    ),
  );
  const r = recovery * recovery * (3 - 2 * recovery);
  return [
    direction[0] * (1 - r),
    direction[1] + (1 - direction[1]) * r,
    direction[2] * (1 - r),
  ];
}
