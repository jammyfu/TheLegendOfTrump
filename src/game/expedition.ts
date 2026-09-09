/** Shared map specification. Coordinates use the estate's south-facing +Z axis. */
export const LANDING = { x: 8, z: 183, heroX: 0, heroZ: 180 };
export type EnemyKind = "sentinel" | "archer" | "brute";
export const ENEMY_RULES = {
  sentinel: {
    name: "剑盾卫兵",
    hp: 3,
    speed: 2,
    range: 10,
    windup: 0.7,
    reward: 8,
  },
  archer: {
    name: "游猎弓箭手",
    hp: 2,
    speed: 2.4,
    range: 24,
    windup: 1.15,
    reward: 10,
  },
  brute: {
    name: "重甲卫兵",
    hp: 6,
    speed: 1.5,
    range: 12,
    windup: 1.25,
    reward: 18,
  },
} satisfies Record<EnemyKind, object>;
export const ENEMY_SPAWNS: { x: number; z: number; kind: EnemyKind }[] = [
  { x: -8, z: 0, kind: "sentinel" },
  { x: 8, z: 0, kind: "sentinel" },
  { x: -8, z: 136, kind: "sentinel" },
  { x: -38, z: 127, kind: "archer" },
  { x: 36, z: 101, kind: "sentinel" },
  { x: 46, z: 97, kind: "archer" },
  { x: -7, z: 85, kind: "sentinel" },
  { x: 7, z: 61, kind: "archer" },
  { x: -54, z: 51, kind: "brute" },
  { x: -68, z: 47, kind: "archer" },
  { x: 60, z: 30, kind: "brute" },
  { x: 70, z: 26, kind: "sentinel" },
  { x: -50, z: -88, kind: "brute" },
  { x: 51, z: -89, kind: "archer" },
];
export const CAMPS = [
  { id: "supply", x: 10, z: 162, safe: true },
  { id: "west-patrol", x: -42, z: 126, safe: false },
  { id: "east-archers", x: 42, z: 96, safe: false },
  { id: "west-veterans", x: -60, z: 42, safe: false },
  { id: "east-veterans", x: 65, z: 22, safe: false },
];
export const FIELD_CHESTS = [
  { id: "chest-landing", x: 5, z: 174 },
  { id: "chest-patrol", x: -45, z: 122 },
  { id: "chest-archers", x: 39, z: 92 },
  { id: "chest-veteran", x: -63, z: 38 },
  { id: "chest-north-west", x: -50, z: -100 },
  { id: "chest-north-east", x: 50, z: -100 },
];
export const COIN_POSITIONS = [
  [-2, 166],
  [0, 154],
  [2, 146],
  [-12, 140],
  [-24, 134],
  [-33, 130],
  [2, 122],
  [5, 113],
  [18, 109],
  [29, 103],
  [2, 102],
  [0, 92],
  [-1, 78],
  [0, 69],
  [0, 52],
  [0, 42],
  [-22, 53],
  [-37, 48],
  [26, 42],
  [43, 35],
  [-62, -68],
  [-56, -83],
  [60, -70],
  [54, -84],
];
export const FIELD_HERBS = [
  [-15, 156],
  [25, 117],
  [-30, 77],
  [35, 53],
  [-72, -72],
  [72, -72],
];
export const FIELD_CRATES = [
  [8, 165],
  [13, 165],
  [-39, 122],
  [45, 92],
  [-57, 38],
  [68, 18],
  [-48, -96],
  [48, -96],
];
