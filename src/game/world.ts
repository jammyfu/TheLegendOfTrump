export type Zone = "grounds" | "office";
export type Collider = {
  id: string;
  zone: Zone;
  x: number;
  z: number;
  top: number;
  bottom?: number;
  radius?: number;
  w?: number;
  d?: number;
  walkable?: boolean;
};
export type Interaction = {
  id: string;
  zone: Zone;
  x: number;
  z: number;
  kind:
    | "door"
    | "desk"
    | "exit"
    | "sign"
    | "chest"
    | "lever"
    | "herb"
    | "bench"
    | "fountain";
  label: string;
};
export const interactions: Interaction[] = [
  {
    id: "door",
    zone: "grounds",
    x: 0,
    z: -13,
    kind: "door",
    label: "进入白宫",
  },
  {
    id: "desk",
    zone: "office",
    x: 0,
    z: -3.9,
    kind: "desk",
    label: "签署冒险宣言",
  },
  {
    id: "exit",
    zone: "office",
    x: 0,
    z: 7.8,
    kind: "exit",
    label: "返回南草坪",
  },
  {
    id: "sign",
    zone: "grounds",
    x: -3,
    z: 18,
    kind: "sign",
    label: "阅读探险告示",
  },
  {
    id: "chest-east",
    zone: "grounds",
    x: 17,
    z: 6,
    kind: "chest",
    label: "打开旅行宝箱",
  },
  {
    id: "chest-garden",
    zone: "grounds",
    x: -13,
    z: -5,
    kind: "chest",
    label: "打开花园宝箱",
  },
  {
    id: "lever",
    zone: "grounds",
    x: -7,
    z: 1,
    kind: "lever",
    label: "拉动花园机关",
  },
  {
    id: "herb-1",
    zone: "grounds",
    x: 18,
    z: 17,
    kind: "herb",
    label: "采集回复草",
  },
  {
    id: "herb-2",
    zone: "grounds",
    x: -18,
    z: -9,
    kind: "herb",
    label: "采集回复草",
  },
  {
    id: "bench-left",
    zone: "grounds",
    x: -18,
    z: 13,
    kind: "bench",
    label: "坐下休息",
  },
  {
    id: "bench-right",
    zone: "grounds",
    x: 18,
    z: 13,
    kind: "bench",
    label: "坐下休息",
  },
  {
    id: "fountain",
    zone: "grounds",
    x: 0,
    z: 4.6,
    kind: "fountain",
    label: "在喷泉边恢复体力",
  },
];
const box = (
  id: string,
  zone: Zone,
  x: number,
  z: number,
  w: number,
  d: number,
  top: number,
  walkable = false,
): Collider => ({ id, zone, x, z, w, d, top, walkable });
const circle = (
  id: string,
  zone: Zone,
  x: number,
  z: number,
  radius: number,
  top: number,
  walkable = false,
): Collider => ({ id, zone, x, z, radius, top, walkable });
export const staticColliders: Collider[] = [
  box("house", "grounds", 0, -19, 30, 7, 10),
  box("wing-west", "grounds", -23, -19.5, 15, 6, 5),
  box("wing-east", "grounds", 23, -19.5, 15, 6, 5),
  circle("basin", "grounds", 0, 1, 3.7, 0.55, true),
  circle("fountain-core", "grounds", 0, 1, 1.65, 2.6),
  box("office-back", "office", 0, -8, 18, 0.5, 8),
  box("office-west", "office", -9, 0, 0.5, 16, 8),
  box("office-east", "office", 9, 0, 0.5, 16, 8),
  box("office-front", "office", 0, 8.8, 18, 0.4, 8),
  box("desk", "office", 0, -5, 6.2, 2.35, 2.2),
  box("chair", "office", 0, -6.3, 1.5, 0.5, 2.6),
  ...[-1, 1].flatMap((s) => [
    box("sofa-" + s, "office", s * 6, 1, 2, 3.7, 1.2, true),
    box("sofa-back-" + s, "office", s * 6.8, 1, 0.4, 3.7, 1.75),
    circle("plant-" + s, "office", s * 7, -5, 0.55, 2.7),
    ...[-5, 12].flatMap((z, i) => [
      box(`bed-${s}-${i}`, "grounds", s * 13, z, 7, i ? 9 : 11, 0.37, true),
      ...[-1, 1].map((a) =>
        box(
          `hedge-${s}-${i}-${a}`,
          "grounds",
          s * 13 + a * 3,
          z,
          0.65,
          i ? 8.5 : 10.5,
          1.025,
        ),
      ),
      box(
        `hedge-end-${s}-${i}`,
        "grounds",
        s * 13,
        z + (i ? 4 : -5),
        6,
        0.65,
        1.025,
      ),
    ]),
    ...[3, 13].flatMap((z) => [
      box(`bench-${s}-${z}`, "grounds", s * 18, z, 1.1, 3, 0.74, true),
      box(
        `benchback-${s}-${z}`,
        "grounds",
        s * 18 + s * 0.45,
        z,
        0.14,
        3,
        1.53,
      ),
    ]),
    ...[-10, 5, 17].map((z) =>
      circle(`lamp-${s}-${z}`, "grounds", s * 6.7, z, 0.23, 3.65),
    ),
    ...[-11, -1, 10, 20].map((z, i) =>
      circle(
        `tree-${s}-${z}`,
        "grounds",
        s * (21 + (i % 2) * 3),
        z,
        0.25 * (1.05 + i * 0.12),
        3.3,
      ),
    ),
    circle(`flag-${s}`, "grounds", s * 8, -12, 0.13, 5.9),
  ]),
  ...[-1.4, -0.85, -0.3, 0.3, 0.85, 1.4].map((a, i) =>
    circle(
      "column-" + i,
      "grounds",
      Math.sin(a) * 4.55,
      -15.8 + Math.cos(a) * 3.7,
      0.55,
      8.4,
    ),
  ),
  ...[0, 1, 2, 3].map((i) =>
    box(
      "step-" + i,
      "grounds",
      0,
      -13.2 - i * 0.47,
      9.6 - i * 0.28,
      3.2 - i * 0.5,
      0.2 + i * 0.2,
      true,
    ),
  ),
  box("sign", "grounds", -3, 18, 1.8, 0.23, 2.2),
  box("chest-east", "grounds", 17, 6, 1.5, 1, 1.1),
  box("chest-garden", "grounds", -13, -5, 1.5, 1, 1.47),
  box("gatepost-west", "grounds", -16.4, 0.6, 0.35, 0.4, 2.6),
  box("gatepost-east", "grounds", -9.6, 0.6, 0.35, 0.4, 2.6),
  box("lever", "grounds", -7, 1, 0.85, 0.85, 0.9),
];
export const gateCollider = box(
  "garden-gate",
  "grounds",
  -13,
  0.6,
  6.5,
  0.25,
  2.5,
);
export const cratePositions: [
  [number, number],
  [number, number],
  [number, number],
] = [
  [-4, 9],
  [16, -11],
  [18, -11],
];
