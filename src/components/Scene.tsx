import { CombatEffects } from "./CombatEffects";
import { Arrival } from "./Arrival";
import { introPose } from "../game/intro";
import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Group,
  Vector3,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
} from "three";
import { game } from "../game/simulation";
import { getInput, releaseMouse } from "../game/input";
import { playSound } from "../game/audio";
import { Grounds, Office } from "./World";
import { Character } from "./Character";
import { Box, Cylinder } from "./Primitives";
import {
  cameraBoom,
  cameraObstacles,
  recoverBoom,
  responsiveFov,
} from "../game/camera";
import { cameraFraction } from "../game/collision";
import { InteractiveProps } from "./InteractiveProps";
const desired = new Vector3(),
  target = new Vector3();
function Runtime() {
  const previousZone = useRef(game.zone);
  const [zone, setZone] = useState(game.zone);
  const first = useRef(true);
  const boom = useRef(game.cameraDistance);
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
      const pose = introPose(game.introTime);
      desired.set(...pose.camera);
      target.set(...pose.target);
      if (pose.t > 12) {
        const q = Math.min(1, (pose.t - 12) / 3);
        const d = game.cameraDistance,
          yaw = game.cameraYaw,
          pitch = game.cameraPitch;
        desired.lerp(
          new Vector3(
            Math.sin(yaw) * Math.cos(pitch) * d,
            1.9 + Math.sin(pitch) * d,
            15 + Math.cos(yaw) * Math.cos(pitch) * d,
          ),
          q * q * (3 - 2 * q),
        );
      }
    } else if (
      game.zone === "office" &&
      (game.phase === "dialogue" || game.phase === "won")
    ) {
      desired.set(0, 3.2, 1.8);
      target.set(0, 2.05, -5.6);
    } else {
      target.set(game.x, game.y + 1.9, game.z);
      const obstacles = cameraObstacles(game.colliders);
      const safe = cameraBoom(
        obstacles,
        target,
        game.cameraYaw,
        game.cameraPitch,
        game.cameraDistance,
      );
      boom.current = first.current
        ? safe.distance
        : recoverBoom(boom.current, safe.distance, delta);
      desired.set(
        target.x + safe.direction.x * boom.current,
        target.y + safe.direction.y * boom.current,
        target.z + safe.direction.z * boom.current,
      );
      // Check the chosen segment again after changing angle; never impose a
      // minimum distance that could place the camera on the other side of a wall.
      desired.lerpVectors(
        target,
        desired,
        cameraFraction(obstacles, target, desired),
      );
    }
    if (game.phase !== "playing" && document.pointerLockElement) releaseMouse();
    const cinematic =
      game.phase === "title" ||
      game.phase === "intro" ||
      game.phase === "dialogue" ||
      game.phase === "won";
    if (cinematic)
      camera.position.lerp(
        desired,
        first.current ? 1 : 1 - Math.exp(-delta * 9),
      );
    else camera.position.copy(desired);
    if (camera instanceof PerspectiveCamera) {
      const fov = cinematic
        ? 48
        : responsiveFov(game.cameraSettings.fov, camera.aspect);
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
    camera.lookAt(target);
    if (
      game.phase === "playing" &&
      game.cameraSettings.shake &&
      game.impactTime > 0 &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const strength = game.impactStrength * (game.impactTime / 0.2) ** 2;
      camera.rotateX(Math.sin(game.impactTime * 95) * 0.008 * strength);
      camera.rotateY(Math.sin(game.impactTime * 77) * 0.009 * strength);
    }
    first.current = false;
  }, -1);
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
      {zone === "grounds" ? (
        <>
          <Grounds />
          <Arrival />
        </>
      ) : (
        <Office />
      )}
      <Character />
      <CombatEffects />
      {zone === "grounds" && (
        <>
          <Entities />
          <InteractiveProps />
        </>
      )}
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
      child.visible = guard.hp > 0 || guard.defeatTime > 0;
      child.position.set(
        guard.x,
        0.12 + (guard.stun > 0 ? 0 : Math.sin(game.elapsed * 3 + i) * 0.12),
        guard.z,
      );
      const recoil =
        guard.stunDuration > 0 ? guard.stun / guard.stunDuration : 0;
      child.rotation.set(
        -Math.sin(recoil * Math.PI * 0.7) * 0.4,
        guard.yaw,
        guard.hp <= 0
          ? (1 - guard.defeatTime / 0.65) * 1.5
          : Math.sin(recoil * Math.PI * 3) * 0.07,
      );
      child.traverse((node) => {
        if (node instanceof Mesh) {
          for (const material of Array.isArray(node.material)
            ? node.material
            : [node.material]) {
            if (material instanceof MeshStandardMaterial) {
              material.emissive.setHex(0xffc078);
              material.emissiveIntensity = guard.hitFlash > 0 ? 0.45 : 0;
            }
          }
        }
      });
      child.scale.setScalar(
        guard.hp <= 0
          ? Math.min(1, guard.defeatTime * 4)
          : guard.windup > 0
            ? 1.05
            : 1,
      );
      const warning = child.getObjectByName("guard-warning");
      if (warning)
        warning.visible = guard.windup > 0 || game.lockedTarget === guard.id;
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
          <group key={g.id} name={`guard-${g.id}`}>
            <mesh name="guard-warning" position={[0, 3, 0]}>
              <octahedronGeometry args={[0.2]} />
              <meshBasicMaterial color="#ff714d" />
            </mesh>
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
      onCreated={({ scene, camera }) => {
        if (import.meta.env.DEV) {
          window.__scene = scene;
          window.__camera = camera;
        }
      }}
      dpr={[1, 1.5]}
      camera={{ fov: 48, near: 0.1, far: 300 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <Runtime />
      </Suspense>
    </Canvas>
  );
}
