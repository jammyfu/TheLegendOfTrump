import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Group, Mesh, MeshBasicMaterial } from "three";
import { game } from "../game/simulation";
import { SPIN } from "../game/combat";
import { HEAVY_PUNCH } from "../game/unarmed";

/** Pooled charge motes and a two-layer radial blade trail. */
export function ChargeEffects() {
  const root = useRef<Group>(null);
  useFrame(() => {
    if (!root.current) return;
    const spinning = game.spinTime > 0;
    const heavyPunch = game.weapon === "none";
    const charge = game.chargeTime / (heavyPunch ? HEAVY_PUNCH.charge : SPIN.maxCharge);
    const t = 1 - game.spinTime / SPIN.duration;
    root.current.visible = game.phase === "playing" && (charge > 0 || spinning);
    root.current.position.set(game.x, game.y, game.z);
    root.current.children.forEach((child, i) => {
      const mesh = child as Mesh,
        material = mesh.material as MeshBasicMaterial;
      if (i < 2) {
        const radius = spinning
          ? SPIN.radius * Math.min(1, t * 5)
          : 0.75 + charge * 0.65;
        mesh.position.y = spinning ? 1.2 + i * 0.25 : 0.12 + i * 0.18;
        mesh.scale.setScalar(radius * (1 - i * 0.08));
        mesh.rotation.set(
          -Math.PI / 2,
          0,
          (spinning ? t * Math.PI * 2 * SPIN.turns : game.elapsed * 3) *
            (i ? -1 : 1),
        );
        material.opacity = spinning ? (1 - t) * 0.7 : 0.15 + charge * 0.4;
        material.color.set(
          game.chargeTime >= (heavyPunch ? HEAVY_PUNCH.charge : SPIN.minCharge) || spinning
            ? heavyPunch ? "#ff8a5b" : "#ffd76b"
            : "#5de3ff",
        );
      } else {
        const a = ((i - 2) * Math.PI) / 6 + game.elapsed * 4;
        const r = spinning ? 1 + t * 3.3 : 2 * (1 - charge * 0.7);
        mesh.position.set(
          Math.cos(a) * r,
          0.5 + ((i * 0.23 + game.elapsed * 0.6) % 1.8),
          Math.sin(a) * r,
        );
        mesh.scale.setScalar(spinning ? Math.max(0, 1 - t) : 0.4 + charge);
        material.opacity = spinning ? 1 - t : 0.25 + charge * 0.7;
      }
    });
  });
  return (
    <group ref={root} name="charge-spin-effects" visible={false}>
      {[0, 1].map((i) => (
        <mesh key={i}>
          <ringGeometry
            args={[
              i ? 0.96 : 0.88,
              1,
              64,
              1,
              0,
              i ? Math.PI * 1.65 : Math.PI * 2,
            ]}
          />
          <meshBasicMaterial
            color="#a5efff"
            transparent
            depthWrite={false}
            side={2}
          />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i + 2}>
          <octahedronGeometry args={[0.075, 0]} />
          <meshBasicMaterial
            color={i % 2 ? "#fff4b7" : "#68ddff"}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
