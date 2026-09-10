import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DirectionalLight, Object3D } from "three";
import { game } from "../game/simulation";
import { renderProfile } from "../game/renderQuality";

/** Outdoor coverage follows play; indoor actor shadows use a fixed overhead rig. */
export function CharacterSun({ zone }: { zone: 'office' | 'grounds' }) {
  const light = useRef<DirectionalLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const indoors = zone === 'office';
  const extent = indoors ? 42 : renderProfile.shadowExtent;
  useFrame(() => {
    if (!light.current) return;
    if (indoors) {
      // Never move the indoor shadow projection with the hero or cutaway camera.
      // A steep angle keeps ordinary character shadows close to their feet.
      target.position.set(0, 0, 0);
      light.current.position.set(-8, 40, 6);
    } else {
      // Small fixed increments reduce shadow shimmer during slow movement.
      const x = Math.round(game.x * 16) / 16;
      const z = Math.round(game.z * 16) / 16;
      target.position.set(x, 0, z);
      light.current.position.set(x - 18, 28, z + 15);
    }
    target.updateMatrixWorld();
  }, -0.5);
  return (
    <>
      <primitive object={target} />
      <directionalLight
        key={zone}
        ref={light}
        name={indoors ? 'office-character-light' : 'character-follow-sun'}
        target={target}
        position={indoors ? [-8, 40, 6] : [-18, 28, 15]}
        intensity={1.8}
        color="#fff6e3"
        castShadow
        shadow-mapSize={[renderProfile.shadowMapSize, renderProfile.shadowMapSize]}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
        shadow-camera-near={0.5}
        shadow-camera-far={160}
        shadow-normalBias={0.035}
        shadow-bias={-0.0001}
      />
    </>
  );
}
