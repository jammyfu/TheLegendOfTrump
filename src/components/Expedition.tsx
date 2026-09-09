import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Group, Mesh, MeshStandardMaterial } from "three";
import { CAMPS, LANDING } from "../game/expedition";
import { game } from "../game/simulation";
import { Box, Cylinder } from "./Primitives";
import { Asset } from "./InteractiveProps";
function Camp({ camp }: { camp: (typeof CAMPS)[number] }) {
  const source = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/field-camp.glb",
  );
  const model = useMemo(() => {
    const m = source.scene.clone(true);
    m.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (camp.safe && (o.material as MeshStandardMaterial).name === "red") {
          const material = (o.material as MeshStandardMaterial).clone();
          material.color.set("#418fc4");
          o.material = material;
        }
      }
    });
    return m;
  }, [source, camp.safe]);
  return (
    <group position={[camp.x, 0, camp.z]} name={`camp-${camp.id}`}>
      <primitive object={model} />
    </group>
  );
}
export function Expedition() {
  const coins = useRef<Group>(null);
  useFrame(() => {
    coins.current?.children.forEach((o, i) => {
      const c = game.coinDrops[i];
      o.visible = !!c && !c.collected;
      if (c) {
        o.position.set(c.x, 0.65 + Math.sin(game.elapsed * 3 + i) * 0.12, c.z);
        o.rotation.y = game.elapsed * 1.5;
      }
    });
  });
  return (
    <group name="expedition-map">
      {CAMPS.map((c) => (
        <Camp key={c.id} camp={c} />
      ))}
      <group position={[LANDING.x, 0.025, LANDING.z]} name="landing-pad">
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[7.4, 7.65, 64]} />
          <meshBasicMaterial color="#e4ddbd" />
        </mesh>
        {[-1, 1].map((x) => (
          <Box
            key={x}
            position={[x * 1.5, 0, 0]}
            scale={[0.25, 0.025, 4]}
            color="#e4ddbd"
          />
        ))}
        <Box scale={[3, 0.025, 0.25]} color="#e4ddbd" />
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <mesh key={`${x}${z}`} position={[x * 7, 0.15, z * 7]}>
              <cylinderGeometry args={[0.16, 0.22, 0.3, 8]} />
              <meshBasicMaterial color="#83cfdf" />
            </mesh>
          )),
        )}
      </group>
      <group ref={coins}>
        {Array.from({ length: 64 }, (_, i) => (
          <group key={i} visible={false} name={`coin-${i}`}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.24, 0.24, 0.075, 12]} />
              <meshStandardMaterial
                color="#edbd4f"
                metalness={0.6}
                roughness={0.3}
                emissive="#8c5915"
                emissiveIntensity={0.25}
              />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
              <octahedronGeometry args={[0.12]} />
              <meshBasicMaterial color="#ffedac" />
            </mesh>
          </group>
        ))}
      </group>
      <group position={[11.5, 0, 159]} name="supply-shop">
        <Box position={[0, 1, 0]} scale={[5, 0.2, 1]} color="#846344" />
        {[-2, 2].map((x) => (
          <Box
            key={x}
            position={[x, 0.5, 0]}
            scale={[0.15, 1, 0.7]}
            color="#6b4c30"
          />
        ))}
        <group position={[-1.5, 1.2, 0]}>
          <Asset
            file="adventure-quiver.glb"
            id="shop-arrows"
            position={[0, 0.3, 0]}
          />
        </group>
        <Cylinder
          position={[1.5, 1.35, 0]}
          radius={0.2}
          rise={0.5}
          color="#b64d62"
        />
        <Cylinder
          position={[1.5, 1.67, 0]}
          radius={0.1}
          rise={0.16}
          color="#e3d2a6"
        />
      </group>
      <group position={[6, 0, 158]} name="safe-campfire">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.sin(i) * 0.6, 0.14, Math.cos(i) * 0.6]}>
            <dodecahedronGeometry args={[0.23]} />
            <meshStandardMaterial color="#7e8174" />
          </mesh>
        ))}
        <mesh position={[0, 0.45, 0]}>
          <coneGeometry args={[0.28, 0.8, 6]} />
          <meshBasicMaterial color="#ffbf66" />
        </mesh>
      </group>
      <group position={[-5, 0, 174]}>
        <Cylinder
          position={[0, 0.8, 0]}
          radius={0.09}
          rise={1.6}
          color="#66452e"
        />
        <Box position={[0, 1.7, 0]} scale={[1.8, 1, 0.23]} color="#936735" />
        <Box
          position={[0, 1.7, 0.13]}
          scale={[1.3, 0.08, 0.02]}
          color="#e6d4a3"
        />
      </group>
    </group>
  );
}
