import { RushEffects } from "./RushEffects";
import { MeteorEffects } from "./MeteorEffects";
import { ChargeEffects } from "./ChargeEffects";
import { AttackTrails } from './AttackTrails';
import { StunStars } from './StunStars';
import { BossGroundEffects } from './BossGroundEffects';
import { useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, SpriteMaterial, TextureLoader, SRGBColorSpace } from "three";
import { game } from "../game/simulation";
export function CombatEffects() {
  const ref = useRef<Group>(null);
  const flashes = useRef<Group>(null);
  const fractures = useRef<Group>(null);
  const texture = useLoader(TextureLoader, import.meta.env.BASE_URL + 'textures/effects/gpt-sword-impact.webp');
  texture.colorSpace = SRGBColorSpace;
  useFrame(({camera}) => {
    flashes.current?.children.forEach((sprite, i) => {
      const effect = game.effects[i];
      sprite.visible = !!effect && !effect.ground && effect.age < 0.28;
      if (!effect) return;
      const t = Math.min(1, effect.age / 0.28);
      sprite.position.set(effect.x, 1.65, effect.z);
      const size = (effect.body ? 1.8 : effect.heavy ? 4.6 : 3) * (0.65 + t * 0.65);
      sprite.scale.setScalar(size);
      const material = (sprite as import('three').Sprite).material as SpriteMaterial;
      material.opacity = (1 - t) ** 2 * (effect.body ? 0.65 : 1);
      material.rotation = (effect.yaw ?? 0) - camera.rotation.y;
      material.color.set(effect.block ? '#88cfff' : effect.source==='boss' ? '#bd87ff' : effect.source==='enemy' ? '#ff653e' : effect.body ? '#ffc293' : '#ffffff');
    });
    ref.current?.children.forEach((group, i) => {
      const effect = game.effects[i];
      group.visible = !!effect && (!effect.ground || effect.age < .36);
      if (!effect) return;
      group.position.set(effect.x, effect.ground ? 0.16 : 1.6, effect.z);
      group.rotation.y = effect.yaw ?? 0;
      group.children.forEach((child, k) => {
        const mesh = child as Mesh;
        const t = Math.min(1,effect.age / (effect.body ? .23 : .36)),
          a = k * 2.39996;
        const radius = (1 - (1 - t) ** 3) * (effect.body ? (effect.heavy ? 1.05 : .7) : effect.heavy ? 2.3 : 1.5);
        mesh.position.set(
          Math.cos(a) * radius,
          effect.ground
            ? (1 - t) * (0.22 + (k % 3) * 0.13) - t * t * 0.45
            : Math.sin(a * 1.7) * radius * 0.8 - t * t * 0.5,
          Math.sin(a) * radius * .5 + radius * .4,
        );
        mesh.scale.set(1 - t, (1 - t) * (effect.body ? 1.4 : effect.heavy ? 3.8 : 2.5), 1 - t);
        const material = mesh.material as MeshBasicMaterial;
        material.opacity = 1 - t;
        material.color.set(
          effect.block ? "#b9e8ff" : effect.source==='boss' ? '#bd87ff' : effect.source==='enemy' ? '#ff653e' : effect.body ? (k % 3 ? "#edc49d" : "#fff7e5") : k % 3 ? "#ffd169" : "#fff6d8",
        );
      });
    });
    fractures.current?.children.forEach((group, i) => {
      const effect = game.effects[i];
      group.visible = !!effect?.ground && effect.age < .62;
      if (!effect?.ground) return;
      const t = Math.min(1, effect.age / .62);
      group.position.set(effect.x, .21, effect.z);
      group.children.forEach((child, k) => {
        const angle = k * 2.39996 + (effect.yaw ?? 0);
        const shard = k < 8;
        const radius = shard ? .2 + t * (1.2 + k % 3) : .4 + (k % 4) * .45;
        child.position.set(Math.cos(angle) * radius,
          shard ? .08 + Math.max(0, t * (2 + k % 3) - t * t * 4) : .005,
          Math.sin(angle) * radius);
        child.rotation.set(shard ? t * 8 + k : 0, angle, shard ? t * 5 : 0);
        child.scale.setScalar(shard ? (1 - t) * (1 + k % 3 * .3) : 1);
        ((child as Mesh).material as MeshBasicMaterial).opacity = (1 - t) ** (shard ? .5 : 1.2);
      });
    });
  });
  return (
    <>
      <RushEffects />
      <MeteorEffects />
      <ChargeEffects />
      <AttackTrails />
      <StunStars />
      <BossGroundEffects />
      <group ref={fractures} name="boss-floor-fractures">
        {Array.from({ length: 8 }, (_, i) => <group key={i} visible={false}>
          {Array.from({ length: 16 }, (_, k) => <mesh key={k}>
            <boxGeometry args={k < 8 ? [.18, .13, .22] : [.055, .01, 1.1]} />
            <meshBasicMaterial color={k < 8 ? "#cbb88c" : "#61452b"} transparent depthWrite={false} />
          </mesh>)}
        </group>)}
      </group>
      <group ref={flashes} name="generated-impact-flashes">
        {Array.from({ length: 8 }, (_, i) => (
          <sprite key={i} visible={false}>
            <spriteMaterial map={texture} blending={AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
          </sprite>
        ))}
      </group>
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
