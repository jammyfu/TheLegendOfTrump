import { ChargeEffects } from "./ChargeEffects";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, MeshBasicMaterial } from "three";
import { game } from "../game/simulation";
export function CombatEffects() {
  const ref = useRef<Group>(null);
  useFrame(() => {
    ref.current?.children.forEach((group, i) => {
      const effect = game.effects[i];
      group.visible = !!effect;
      if (!effect) return;
      group.position.set(effect.x, 1.6, effect.z);
      group.children.forEach((child, k) => {
        const mesh = child as Mesh;
        const t = effect.age / 0.36,
          a = k * 2.39996;
        const radius = (1 - (1 - t) ** 3) * (effect.heavy ? 2.3 : 1.5);
        mesh.position.set(
          Math.cos(a) * radius,
          Math.sin(a * 1.7) * radius * 0.8 - t * t * 0.5,
          Math.sin(a) * radius,
        );
        mesh.scale.set(1 - t, (1 - t) * (effect.heavy ? 3.8 : 2.5), 1 - t);
        const material = mesh.material as MeshBasicMaterial;
        material.opacity = 1 - t;
        material.color.set(
          effect.block ? "#b9e8ff" : k % 3 ? "#ffd169" : "#fff6d8",
        );
      });
    });
  });
  return (
    <>
      <ChargeEffects />
      <group ref={ref} name="combat-effects">
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} visible={false}>
            {Array.from({ length: 10 }, (_, k) => (
              <mesh key={k} rotation={[k, k * 0.7, k * 1.3]}>
                <octahedronGeometry args={[0.1, 0]} />
                <meshBasicMaterial transparent depthWrite={false} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </>
  );
}
