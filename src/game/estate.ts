import type { Collider } from "./world";
/** World-unit conversion is calibrated against the existing ~2.7-unit hero. */
export const METRE = 1.4;
export const RESIDENCE = {
  width: 51.2 * METRE,
  depth: 26.1 * METRE,
  height: 21.34 * METRE,
  front: -17,
};
export const ESTATE_BOUNDS = { west: -140, east: 140, north: -160, south: 235 };
const solid = (
  id: string,
  x: number,
  z: number,
  w: number,
  d: number,
  top: number,
  bottom = 0,
): Collider => ({ id, zone: "grounds", x, z, w, d, top, bottom });
export const estateColliders: Collider[] = [
  solid(
    "house",
    0,
    RESIDENCE.front - RESIDENCE.depth / 2,
    RESIDENCE.width,
    RESIDENCE.depth,
    RESIDENCE.height,
  ),
  solid("wing-west", -104, -34, 36, 34, 10.3),
  solid("wing-east", 105, -43, 38, 25, 10.3),
  solid("west-colonnade-roof", -61, -36, 52, 8, 6, 5.4),
  solid("east-colonnade-roof", 61, -36, 52, 8, 6, 5.4),
  ...[-1, 1].flatMap((side) =>
    Array.from({ length: 12 }, (_, i) => ({
      id: `estate-colonnade-${side}-${i}`,
      zone: "grounds" as const,
      x: side * (38 + i * 4),
      z: -32,
      radius: 0.25,
      top: 5.6,
    })),
  ),
  ...[-1.4, -0.85, -0.3, 0.3, 0.85, 1.4].map((a, i) => ({
    id: `column-${i}`,
    zone: "grounds" as const,
    x: Math.sin(a) * 8.8,
    z: -17.4 + Math.cos(a) * 6,
    radius: 0.8,
    bottom: 0,
    top: 24.2,
  })),
  ...[6, 14.2, 24.2].map((y, i) => ({
    id: `south-balcony-${i}`,
    zone: "grounds" as const,
    x: 0,
    z: -17.4,
    radius: 10.4,
    bottom: y - 0.25,
    top: y + 0.25,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `north-column-${i}`,
    zone: "grounds" as const,
    x: -9 + i * 3.6,
    z: -61,
    radius: 0.55,
    top: 21.5,
  })),
  solid("north-portico-roof", 0, -58, 23, 9, 22.4, 21.6),
  {
    id: "oval-office-exterior",
    zone: "grounds",
    x: -98,
    z: -19,
    radius: 8,
    top: 7.6,
  },
  ...[-1, 1].flatMap((side) =>
    Array.from({ length: 27 }, (_, i) => ({
      id: `estate-tree-${side}-${i}`,
      zone: "grounds" as const,
      x: side * (91 + (i % 3) * 13),
      z: -115 + i * 13,
      radius: 0.45,
      top: (8 + (i % 5) * 1.2) * 0.8,
    })),
  ),
  solid("west-boundary", -140, 37.5, 0.4, 395, 2.9),
  solid("east-boundary", 140, 37.5, 0.4, 395, 2.9),
  solid("north-boundary", 0, -160, 280, 0.4, 2.9),
  solid("south-boundary", 0, 235, 280, 0.4, 2.9),
];
