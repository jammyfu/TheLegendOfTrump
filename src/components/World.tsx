import { OfficeScene } from "./OfficeScene";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { Box, Cylinder, Tree, Flag } from "./Primitives";
import { game } from "../game/simulation";
function Window({ x, y, z = -15.42 }: { x: number; y: number; z?: number }) {
  return (
    <group position={[x, y, z]}>
      <Box scale={[1.16, 1.93, 0.14]} color="#bfbba8" />
      <Box position={[0, 0, 0.09]} scale={[0.93, 1.69, 0.05]} color="#405763" />
      <Box position={[0, 0, 0.14]} scale={[0.07, 1.7, 0.07]} color="#eae4d2" />
      {[-0.45, 0.05, 0.55].map((a) => (
        <Box
          key={a}
          position={[0, a, 0.14]}
          scale={[0.95, 0.055, 0.08]}
          color="#eae4d2"
        />
      ))}
      <Box position={[0, -1, 0.15]} scale={[1.35, 0.12, 0.4]} />
      <Box position={[0, 1, 0.1]} scale={[1.28, 0.15, 0.3]} />
    </group>
  );
}
function WhiteHouse() {
  return (
    <group>
      <Box position={[0, 4.4, -19]} scale={[30, 8.8, 7]} color="#e6dfcb" />
      <Box position={[0, 0.4, -18.4]} scale={[31, 0.8, 8.5]} color="#c3bfae" />
      {[3.15, 6.2, 8.6, 9.05].map((y, i) => (
        <Box
          key={y}
          position={[0, y, -18.9]}
          scale={[i === 3 ? 31 : 30.5, i === 3 ? 0.35 : 0.18, 7.6]}
          color={i === 3 ? "#d9d2bc" : "#f3ecda"}
        />
      ))}
      {[-13, -10.5, -8, -5.5, 5.5, 8, 10.5, 13].flatMap((x) =>
        [1.85, 4.7, 7.35].map((y) => <Window key={`${x}-${y}`} x={x} y={y} />),
      )}
      <Box position={[0, 8.9, -19]} scale={[28, 0.35, 6]} color="#5d6b69" />
      <Box position={[0, 9.4, -21.6]} scale={[30, 0.55, 0.35]} />
      {[-14.5, -11, -7.5, -4, 0, 4, 7.5, 11, 14.5].map((x) => (
        <Box key={x} position={[x, 9.5, -15.65]} scale={[0.4, 0.85, 0.45]} />
      ))}
      <Box position={[0, 9.8, -15.65]} scale={[30.5, 0.15, 0.6]} />
      <Cylinder
        position={[0, 8.7, -15.6]}
        radius={5.4}
        rise={0.5}
        segments={16}
        color="#eee6d0"
      />
      <Cylinder
        position={[0, 8.32, -15.6]}
        radius={5.12}
        rise={0.28}
        segments={16}
        color="#cfc8b5"
      />
      {[-1.4, -0.85, -0.3, 0.3, 0.85, 1.4].map((a, i) => {
        const x = Math.sin(a) * 4.55,
          z = -15.8 + Math.cos(a) * 3.7;
        return (
          <group key={i}>
            <Cylinder
              position={[x, 4.5, z]}
              radius={0.35}
              top={0.29}
              rise={7.3}
              color="#f2ebd7"
            />
            <Cylinder position={[x, 0.9, z]} radius={0.55} rise={0.2} />
            <Cylinder position={[x, 8.15, z]} radius={0.5} rise={0.24} />
          </group>
        );
      })}
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          position={[0, 0.1 + i * 0.1, -13.2 - i * 0.47]}
          scale={[9.6 - i * 0.28, 0.2 + i * 0.2, 3.2 - i * 0.5]}
          color="#d2cbbb"
        />
      ))}
      <Box
        position={[0, 1.9, -15.35]}
        scale={[2.05, 3.15, 0.22]}
        color="#a9935b"
      />
      <Box
        position={[0, 1.85, -15.17]}
        scale={[1.6, 2.85, 0.1]}
        color="#293a3a"
      />
      <Box
        position={[0, 2.35, -15.09]}
        scale={[1.28, 1.35, 0.08]}
        color="#64817b"
      />
      <Cylinder
        position={[0, 5.7, -15.05]}
        radius={0.8}
        rise={0.12}
        rotation={[Math.PI / 2, 0, 0]}
        color="#bb9d59"
      />
      <Cylinder
        position={[0, 5.7, -14.97]}
        radius={0.63}
        rise={0.05}
        rotation={[Math.PI / 2, 0, 0]}
        color="#273e58"
      />
      <Flag position={[0, 9, -19]} scale={0.9} />
      {[-11, 11].map((x) => (
        <group key={x}>
          <Box position={[x, 10, -20]} scale={[1.05, 2, 1.1]} color="#d5ccb6" />
          <Box position={[x, 11, -20]} scale={[1.35, 0.22, 1.4]} />
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[s * 23, 2.3, -19.5]}
            scale={[15, 4.6, 6]}
            color="#ded6c1"
          />
          <Box position={[s * 23, 4.65, -19.5]} scale={[15.5, 0.35, 6.5]} />
          {[18, 21, 24, 27, 29].map((x) => (
            <Window key={x} x={s * x} y={2.4} z={-16.42} />
          ))}
        </group>
      ))}
    </group>
  );
}
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
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#819663" />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 1]}
        receiveShadow
      >
        <planeGeometry args={[38, 43]} />
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
      <WhiteHouse />
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
      {Array.from({ length: 27 }, (_, i) => (
        <group key={i} position={[-26 + i * 2, 0, 24]}>
          <Cylinder
            position={[0, 0.85, 0]}
            radius={0.04}
            rise={1.7}
            color="#384c43"
            segments={4}
          />
          <Box position={[0, 0.7, 0]} scale={[2, 0.07, 0.07]} color="#384c43" />
          <Box position={[0, 1.4, 0]} scale={[2, 0.07, 0.07]} color="#384c43" />
        </group>
      ))}
    </group>
  );
}
export function Office() {
  return <OfficeScene />;
}
