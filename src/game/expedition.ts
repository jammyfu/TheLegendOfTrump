/** Shared map specification. Coordinates use the estate's south-facing +Z axis. */
export const LANDING = { x: 8, z: 183, heroX: 0, heroZ: 180 };
export type EnemyKind = "sentinel" | "archer" | "brute";
export const ENEMY_RULES = {
  sentinel: {
    name: "剑盾卫兵",
    hp: 5,
    speed: 3.3,
    scale: 1.22,
    range: 18,
    windup: 0.65,
    stunScale: 1,
    defenseChance: 0,
    reward: 8,
  },
  archer: {
    name: "游猎弓箭手",
    hp: 4,
    speed: 3.5,
    scale: 1.15,
    range: 28,
    windup: 0.95,
    stunScale: 0.78,
    defenseChance: 0,
    reward: 10,
  },
  brute: {
    name: "重甲卫兵",
    hp: 10,
    speed: 2.6,
    scale: 1.3,
    range: 20,
    windup: 1.05,
    // Heavy armor can absorb light hits and recover its footing quickly.
    stunScale: 0.42,
    defenseChance: 0.28,
    reward: 18,
  },
} satisfies Record<EnemyKind, object>;
export const ENEMY_SPAWNS: { x: number; z: number; kind: EnemyKind; sizeMultiplier?: number; title?: string }[] = [
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
  { x: -5, z: -6, kind: "sentinel" },
  { x: 5, z: -5, kind: "sentinel" },
  { x: 18, z: -4, kind: "archer" },
  { x: 0, z: -8, kind: "brute", sizeMultiplier: 1.5, title: "门前重甲队长" },
  { x: -42, z: 118, kind: "brute", sizeMultiplier: 1.5, title: "西营剑冢守护者" },
  { x: 41, z: 88, kind: "brute", sizeMultiplier: 1.7, title: "东营盾台守护者" },
];
export const CAMPS = [
  { id: "supply", x: 10, z: 162, safe: true },
  { id: "west-patrol", x: -42, z: 126, safe: false },
  { id: "east-archers", x: 42, z: 96, safe: false },
  { id: "west-veterans", x: -60, z: 42, safe: false },
  { id: "east-veterans", x: 65, z: 22, safe: false },
];
export const FIELD_CHESTS = [
  { id: "chest-wood-sword", x: -3, z: 177 },
  { id: "chest-wood-shield", x: 3, z: 177 },
  { id: "chest-sword", x: -48, z: 116 },
  { id: "chest-shield", x: 48, z: 86 },
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

export function enemyScale(enemy: { kind: EnemyKind; sizeMultiplier?: number }) {
  return ENEMY_RULES[enemy.kind].scale * (enemy.sizeMultiplier ?? 1);
}
