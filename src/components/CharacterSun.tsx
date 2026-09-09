import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DirectionalLight, Object3D } from "three";
import { game } from "../game/simulation";

/** Keep the existing sun direction while moving its shadow coverage with play. */
export function CharacterSun() {
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  useFrame(() => {
    if (!light.current) return;
    // Small fixed increments reduce shadow shimmer during slow movement.
    const x = Math.round(game.x * 16) / 16;
    const z = Math.round(game.z * 16) / 16;
    target.position.set(x, 0, z);
    light.current.position.set(x - 18, 28, z + 15);
    target.updateMatrixWorld();
  }, -0.5);
  return (
    <>
      <primitive object={target} />
      <directionalLight
        ref={light}
        name="character-follow-sun"
        target={target}
        position={[-18, 28, 15]}
        intensity={1.8}
        color="#fff6e3"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={0.5}
        shadow-camera-far={160}
        shadow-normalBias={0.035}
        shadow-bias={-0.0001}
      />
    </>
  );
}
