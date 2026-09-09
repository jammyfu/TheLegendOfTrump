import { Estate } from "./Estate";
import { OfficeScene } from "./OfficeScene";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { Box, Cylinder, Tree, Flag } from "./Primitives";
import { game } from "../game/simulation";
function Lamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Cylinder
        position={[0, 1.6, 0]}
        radius={0.065}
        rise={3.2}
        color="#33423d"
      />
      <Cylinder
        position={[0, 0.14, 0]}
        radius={0.22}
        rise={0.28}
        color="#38413c"
      />
      <Box position={[0, 3.1, 0]} scale={[0.34, 0.5, 0.34]} color="#ebd6a0" />
      <Cylinder
        position={[0, 3.48, 0]}
        top={0}
        radius={0.4}
        rise={0.3}
        segments={4}
        color="#33423d"
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[s * 0.19, 3.1, 0.18]}
          scale={[0.04, 0.62, 0.04]}
          color="#33423d"
        />
      ))}
    </group>
  );
}
function Fountain() {
  const water = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (water.current) water.current.rotation.y = clock.elapsedTime * 0.12;
  });
  return (
    <group position={[0, 0, 1]}>
      <Cylinder
        position={[0, 0.13, 0]}
        radius={3.7}
        rise={0.26}
        segments={32}
        color="#b5b5a5"
      />
      <Cylinder
        position={[0, 0.32, 0]}
        radius={3.45}
        rise={0.4}
        segments={32}
        color="#e1d6bd"
      />
      <Cylinder
        position={[0, 0.54, 0]}
        radius={3.14}
        rise={0.06}
        segments={32}
        color="#679c9d"
      />
      <Cylinder
        position={[0, 0.91, 0]}
        radius={0.65}
        top={0.42}
        rise={1.2}
        color="#c4c5af"
      />
      <Cylinder
        position={[0, 1.62, 0]}
        radius={1.38}
        top={1.65}
        rise={0.23}
        segments={16}
        color="#dcd5bc"
      />
      <Cylinder
        position={[0, 1.77, 0]}
        radius={1.5}
        rise={0.03}
        segments={24}
        color="#8fbabd"
      />
      <Cylinder
        position={[0, 2.08, 0]}
        radius={0.22}
        rise={0.65}
        color="#c4c5af"
      />
      <mesh position={[0, 2.55, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#c8e8df" />
      </mesh>
      <group ref={water}>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i * Math.PI) / 8;
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * 1.4, 1.13, Math.cos(a) * 1.4]}
            >
              <cylinderGeometry args={[0.021, 0.06, 1.1, 5]} />
              <meshStandardMaterial
                color="#bbe7dd"
                transparent
                opacity={0.65}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
function Ground() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#b8b8a8";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const n = (x * 17 + y * 13) % 19;
        ctx.fillStyle = `rgb(${180 + n},${179 + n},${164 + n})`;
        ctx.fillRect(x * 64 + 1, y * 64 + 1, 62, 62);
      }
    const t = new CanvasTexture(canvas);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(12, 14);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[280, 470]} />
        <meshStandardMaterial color="#819663" />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 1]}
        receiveShadow
      >
        <planeGeometry args={[6, 43]} />
        <meshStandardMaterial map={texture} roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          {[-5, 12].map((z, i) => (
            <group key={z}>
              <Box
                position={[s * 13, 0.12, z]}
                scale={[7, 0.24, i ? 9 : 11]}
                color="#d9d2b8"
              />
              <Box
                position={[s * 13, 0.27, z]}
                scale={[6.5, 0.2, i ? 8.5 : 10.5]}
                color="#718854"
              />
              {[-1, 1].map((a) => (
                <Box
                  key={a}
                  position={[s * 13 + a * 3, 0.65, z]}
                  scale={[0.65, 0.75, i ? 8.5 : 10.5]}
                  color="#536b43"
                />
              ))}
              <Box
                position={[s * 13, 0.65, z + (i ? 4 : -5)]}
                scale={[6, 0.75, 0.65]}
                color="#536b43"
              />
              {Array.from({ length: 14 }, (_, j) => (
                <mesh
                  key={j}
                  position={[
                    s * 13 - 2.4 + (j % 5) * 1.2,
                    0.62,
                    z - 2 + Math.floor(j / 5) * 1.8,
                  ]}
                >
                  <icosahedronGeometry args={[0.22, 0]} />
                  <meshStandardMaterial
                    color={j % 2 ? "#e0ba72" : "#d58474"}
                    flatShading
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}
    </>
  );
}
export function Grounds() {
  return (
    <group>
      <Ground />
      <Estate />
      <Fountain />
      {[-1, 1].flatMap((s) =>
        [-11, -1, 10, 20].map((z, i) => (
          <Tree
            key={`${s}-${z}`}
            x={s * (21 + (i % 2) * 3)}
            z={z}
            size={1.05 + i * 0.12}
          />
        )),
      )}
      {[-1, 1].flatMap((s) =>
        [-10, 5, 17].map((z) => <Lamp key={`${s}-${z}`} x={s * 6.7} z={z} />),
      )}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Flag position={[s * 8, 0, -12]} scale={1.05} />
          {[3, 13].map((z) => (
            <group position={[s * 18, 0, z]} key={z}>
              <Box
                position={[0, 0.65, 0]}
                scale={[1.1, 0.17, 3]}
                color="#75593e"
              />
              <Box
                position={[s * 0.45, 1.1, 0]}
                scale={[0.14, 0.85, 3]}
                color="#806345"
              />
              {[-1, 1].map((a) => (
                <Box
                  key={a}
                  position={[0, 0.3, a]}
                  scale={[0.8, 0.6, 0.13]}
                  color="#344a40"
                />
              ))}
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
export function Office() {
  return <OfficeScene />;
}
