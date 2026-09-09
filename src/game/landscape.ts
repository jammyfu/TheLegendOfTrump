import layout from "./landscape-layout.json";
import type { Collider } from "./world";
/** Collision and the Blender builder read the same landscape placement file. */
export const landscapeColliders: Collider[] = layout.flatMap(
  (p, i): Collider[] => {
    const base = {
      id: `landscape-${i}`,
      zone: "grounds" as const,
      x: p.x,
      z: p.z,
    };
    const size = "size" in p ? (p.size ?? 1) : 1;
    switch (p.kind) {
      case "tree":
        return [{ ...base, radius: 0.32 * size, top: 5.2 * size }];
      case "rock":
        return [{ ...base, radius: size * 0.9, top: 1.15 * size }];
      case "lamp":
        return [{ ...base, radius: 0.24, top: 3.9 }];
      case "bed":
        return [{ ...base, w: 8, d: 5, top: 0.98 }];
      case "bench":
        return [
          { ...base, w: 3, d: 0.8, top: 0.76, walkable: true },
          {
            ...base,
            id: base.id + "-back",
            z: p.z - 0.4,
            w: 3,
            d: 0.12,
            top: 1.5,
          },
        ];
      default:
        return [];
    }
  },
);
export { layout as landscapeLayout };
