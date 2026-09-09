import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { game } from "../game/simulation";
import { getInput } from "../game/input";
import { playSound } from "../game/audio";
import { Grounds, Office } from "./World";
import { Character } from "./Character";
import { Box, Cylinder } from "./Primitives";
const desired = new Vector3(),
  target = new Vector3();
function Runtime() {
  const previousZone = useRef(game.zone);
  const [zone, setZone] = useState(game.zone);
  const first = useRef(true);
  useFrame(({ camera }, delta) => {
    for (let remaining = Math.min(delta, 0.2); remaining > 0; remaining -= 0.05)
      game.update(Math.min(remaining, 0.05), getInput());
    for (const event of game.events.splice(0)) playSound(event);
    if (previousZone.current !== game.zone) {
      previousZone.current = game.zone;
      setZone(game.zone);
      first.current = true;
    }
    if (game.phase === "title") {
      desired.set(16, 9.5, 29);
      target.set(-1, 3, -5);
    } else if (game.phase === "intro") {
      desired.set(game.x + 0.25, 1.55, game.z + 6.2);
      target.set(game.x, 1.6, game.z);
    } else if (
      game.zone === "office" &&
      (game.phase === "dialogue" || game.phase === "won")
    ) {
      desired.set(0, 3.2, 1.8);
      target.set(0, 2.05, -5.6);
    } else if (game.zone === "office") {
      desired.set(game.x * 0.4, 7.5, Math.max(game.z + 8, 7));
      target.set(game.x * 0.45, 1.6, game.z - 3);
    } else {
      const yaw = game.cameraYaw;
      desired.set(
        game.x + Math.sin(yaw) * 10.5,
        4.9,
        game.z + Math.cos(yaw) * 10.5,
      );
      target.set(game.x - Math.sin(yaw) * 2, 2.6, game.z - Math.cos(yaw) * 2);
    }
    camera.position.lerp(desired, first.current ? 1 : 1 - Math.exp(-delta * 5));
    camera.lookAt(target);
    first.current = false;
  });
  return (
    <>
      <color
        attach="background"
        args={[zone === "grounds" ? "#555de0" : "#d8c7a1"]}
      />
      <fog
        attach="fog"
        args={[zone === "grounds" ? "#777aca" : "#d8c7a1", 40, 100]}
      />
      <ambientLight intensity={zone === "grounds" ? 0.8 : 1.1} />
      <hemisphereLight args={["#bac6ed", "#6b655c", 0.8]} />
      <directionalLight
        position={[-18, 28, 15]}
        intensity={1.8}
        color="#fff6e3"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-normalBias={0.06}
      />
      {zone === "grounds" ? <Grounds /> : <Office />}
      <Character />
      {zone === "grounds" && <Entities />}
      <DoorMarker />
    </>
  );
}
function Entities() {
  const gems = useRef<Group>(null),
    pots = useRef<Group>(null),
    guards = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (gems.current) gems.current.visible = game.phase !== "intro";
    if (guards.current) guards.current.visible = game.phase !== "intro";
    gems.current?.children.forEach((child, i) => {
      child.visible = !game.items[i].collected;
      child.position.y = 1.05 + Math.sin(clock.elapsedTime * 2.5 + i) * 0.16;
      child.rotation.y = clock.elapsedTime + i;
    });
    pots.current?.children.forEach((child, i) => {
      child.visible = !game.pots[i].broken;
    });
    guards.current?.children.forEach((child, i) => {
      const guard = game.guards[i];
      child.visible = guard.hp > 0;
      child.position.set(
        guard.x,
        0.12 + Math.sin(clock.elapsedTime * 3 + i) * 0.12,
        guard.z,
      );
      child.rotation.y = -game.elapsed * 0.55 - i * Math.PI;
    });
  });
  return (
    <>
      <group ref={gems}>
        {game.items.map((gem) => (
          <group key={gem.id} position={[gem.x, 1, gem.z]}>
            <mesh castShadow scale={[0.33, 0.61, 0.33]}>
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial
                color="#73dc81"
                emissive="#207c49"
                emissiveIntensity={0.3}
                metalness={0.2}
                roughness={0.28}
                flatShading
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
              <ringGeometry args={[0.38, 0.45, 16]} />
              <meshBasicMaterial color="#d1eab2" transparent opacity={0.5} />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={pots}>
        {game.pots.map((p) => (
          <group key={p.id} position={[p.x, 0, p.z]}>
            <Cylinder
              position={[0, 0.55, 0]}
              radius={0.43}
              top={0.61}
              rise={0.9}
              segments={8}
              color="#ae7250"
            />
            <Cylinder
              position={[0, 1.07, 0]}
              radius={0.59}
              top={0.39}
              rise={0.25}
              segments={8}
              color="#c99566"
            />
            <Cylinder
              position={[0, 1.24, 0]}
              radius={0.43}
              rise={0.13}
              segments={8}
              color="#e3be83"
            />
            <Cylinder
              position={[0, 1.31, 0]}
              radius={0.32}
              rise={0.01}
              color="#513c30"
            />
            <Cylinder
              position={[0, 0.65, 0]}
              radius={0.55}
              rise={0.12}
              segments={8}
              color="#dcbf82"
            />
          </group>
        ))}
      </group>
      <group ref={guards}>
        {game.guards.map((g) => (
          <group key={g.id}>
            <Cylinder
              position={[0, 0.35, 0]}
              radius={0.5}
              rise={0.5}
              segments={8}
              color="#53636b"
            />
            <Box position={[0, 1.1, 0]} scale={[0.9, 1, 0.6]} color="#6d7d80" />
            <Box
              position={[0, 1.95, 0]}
              scale={[0.75, 0.7, 0.7]}
              color="#899393"
            />
            <Box
              position={[0, 2, 0.36]}
              scale={[0.61, 0.12, 0.05]}
              color="#bd5e43"
            />
            <Box
              position={[0, 2.4, 0]}
              scale={[0.16, 0.4, 0.48]}
              color="#ae5d4c"
            />
            {[-1, 1].map((s) => (
              <Box
                key={s}
                position={[s * 0.62, 1.2, 0]}
                scale={[0.25, 0.85, 0.3]}
                color="#495e64"
              />
            ))}
            <Cylinder
              position={[-0.7, 1.2, 0.4]}
              radius={0.45}
              rise={0.12}
              rotation={[Math.PI / 2, 0, 0]}
              segments={8}
              color="#967d54"
            />
          </group>
        ))}
      </group>
    </>
  );
}
function DoorMarker() {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.visible =
        game.phase === "playing" && (game.zone === "office" || game.gems >= 8);
      ref.current.position.set(
        0,
        3.8 + Math.sin(clock.elapsedTime * 2) * 0.15,
        game.zone === "office" ? -4.7 : -13.7,
      );
      ref.current.rotation.y = clock.elapsedTime;
    }
  });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.25, 0.45, 4]} />
        <meshStandardMaterial
          color="#e8c776"
          emissive="#aa7f26"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}
export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: 48, near: 0.1, far: 140 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerDown={(e) => {
        if (e.button !== 0 || game.phase !== "playing") return;
        const element = e.target as HTMLCanvasElement;
        element.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (
          e.buttons === 1 &&
          game.phase === "playing" &&
          game.zone === "grounds" &&
          e.pointerType === "mouse"
        )
          game.cameraYaw -= e.movementX * 0.006;
      }}
    >
      <Suspense fallback={null}>
        <Runtime />
      </Suspense>
    </Canvas>
  );
}
