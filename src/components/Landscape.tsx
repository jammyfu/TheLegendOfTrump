import { stabilizeFacadeMaterials } from "../game/facadeMaterials";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Mesh, Group } from "three";
import { game } from "../game/simulation";
import { applyLegendMaterials } from "../game/materials";
import { mobileRenderProfile } from "../game/renderQuality";
export function Landscape() {
  const gltf = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/park-landscape.glb",
  );
  const { model, facadeMaterials } = useMemo(() => {
    const m = gltf.scene.clone(true);
    applyLegendMaterials(m);
    m.traverse((o) => {
      if (o instanceof Mesh) {
        // The landscape is the largest draw surface. Mobile uses its baked
        // materials without dynamic shadows; nearby actors still cast them.
        o.receiveShadow = !mobileRenderProfile;
        o.castShadow = !mobileRenderProfile && !!o.parent?.name.startsWith("Garden");
      }
    });
    return { model: m, facadeMaterials: stabilizeFacadeMaterials(m) };
  }, [gltf]);
  useEffect(() => () => facadeMaterials.forEach((material) => material.dispose()), [facadeMaterials]);
  const birds = useRef<Group>(null);
  useFrame(() => {
    if (game.phase === "paused") return;
    birds.current?.children.forEach((o, i) => {
      o.position.set(
        Math.sin(game.elapsed * 0.025 + i * 0.5) * (70 + i * 4),
        24 + (i % 3) * 3,
        95 + Math.cos(game.elapsed * 0.025 + i * 0.5) * 80,
      );
      o.rotation.y = game.elapsed * 0.025 + i * 0.5 + Math.PI / 2;
      const flap = Math.sin(game.elapsed * 5 + i) * 0.45;
      o.children[0].rotation.z = flap;
      o.children[1].rotation.z = -flap;
    });
  });
  return (
    <group name="landscape-and-city">
      <primitive object={model} />
      <group ref={birds} name="park-bird-flock">
        {Array.from({ length: mobileRenderProfile ? 3 : 8 }, (_, i) => (
          <group key={i}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.28, 0, 0]}>
                <boxGeometry args={[0.62, 0.035, 0.16]} />
                <meshBasicMaterial color="#516165" />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}
