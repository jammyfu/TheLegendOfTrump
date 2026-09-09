import { AdaptiveResolution } from "./AdaptiveResolution";
import { LANDING } from "../game/expedition";
import { RangedCombat } from "./RangedCombat";
import { rayFraction } from "../game/collision";
import { EnemyModel } from "./EnemyModel";
import { combatMusicHold } from "../game/combatMusic";
import { CombatEffects } from "./CombatEffects";
import { musicPhase } from "../game/music";
import { AdventureSky } from "./AdventureSky";
import { Arrival } from "./Arrival";
import { INTRO_DURATION, introPose } from "../game/intro";
import { Suspense, useRef, useState, memo } from "react";
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
import { playSound, rotorSound } from "../game/audio";
import { Grounds, Office } from "./World";
import { Character } from "./Character";
import { Box, Cylinder } from "./Primitives";
import {
  cameraBoom,
  indoorFrame,
  cameraObstacles,
  recoverBoom,
  responsiveFov,
} from "../game/camera";
import { cameraFraction } from "../game/collision";
import { InteractiveProps } from "./InteractiveProps";
const desired = new Vector3(),
  target = new Vector3();
const Runtime = memo(RuntimeContent);
function RuntimeContent() {
  const tension = useRef(0);
  const previousZone = useRef(game.zone);
  const previousPhase = useRef(game.phase);
  const [zone, setZone] = useState(game.zone);
  const first = useRef(true);
  const boom = useRef(game.cameraDistance);
  const focus = useRef(new Vector3());
  useFrame(({ camera }, delta) => {
    for (let remaining = Math.min(delta, 0.2); remaining > 0; remaining -= 0.05)
      game.update(Math.min(remaining, 0.05), getInput());
    for (const event of game.events.splice(0)) playSound(event);
    rotorSound(game.phase === "intro" ? game.introTime : null);
    const threat =
      game.zone === "grounds" &&
      game.phase === "playing" &&
      game.guards.some(
        (g) =>
          g.hp > 0 &&
          (g.windup > 0 ||
            (Math.hypot(g.x - game.x, g.z - game.z) < 7 &&
              game.visible(g.x, g.z, "guard-" + g.id))),
      );
    tension.current = combatMusicHold(
      tension.current,
      Math.min(delta, 0.2),
      game.phase,
      game.zone === "grounds",
      threat,
    );
    musicPhase(
      game.phase,
      tension.current > 0,
      INTRO_DURATION - game.introTime,
    );
    if (previousZone.current !== game.zone) {
      previousZone.current = game.zone;
      setZone(game.zone);
      first.current = true;
    }
    if (previousPhase.current !== game.phase && game.phase === "playing")
      first.current = true;
    previousPhase.current = game.phase;
    if (game.phase === "title") {
      desired.set(16, 9.5, 29);
      target.set(-1, 3, -5);
    } else if (game.phase === "intro") {
      const pose = introPose(game.introTime);
      desired.set(...pose.camera);
      target.set(...pose.target);
      if (pose.t > INTRO_DURATION - 3) {
        const q = Math.min(1, (pose.t - (INTRO_DURATION - 3)) / 3);
        const d = game.cameraDistance,
          yaw = game.cameraYaw,
          pitch = game.cameraPitch;
        desired.lerp(
          new Vector3(
            Math.sin(yaw) * Math.cos(pitch) * d,
            1.9 + Math.sin(pitch) * d,
            LANDING.heroZ + Math.cos(yaw) * Math.cos(pitch) * d,
          ),
          q * q * (3 - 2 * q),
        );
      }
    } else if (
      game.zone === "office" &&
      (game.phase === "dialogue" || game.phase === "won")
    ) {
      desired.set(0, 3.2, -3.45);
      target.set(0, 2.05, -10.85);
    } else {
      const indoors = game.zone === "office";
      const frame = indoorFrame(
        game,
        game.cameraYaw,
        game.cameraPitch,
        game.cameraDistance,
        game.lockTarget,
      );
      target.set(game.x, game.y + (indoors ? 2.3 : 1.9), game.z);
      const obstacles = cameraObstacles(game.colliders);
      if (indoors || game.lockTarget) {
        desired.set(frame.target.x, frame.target.y, frame.target.z);
        // Focus must stay on the player's side of furniture and walls, too.
        target.lerp(
          desired,
          cameraFraction(
            game.colliders.filter((c) => !c.id.startsWith("guard-")),
            target,
            desired,
          ),
        );
      }
      // Keep the same smoothed focus through lock acquisition, target changes
      // and release, so losing a target never snaps back to the player.
      focus.current.lerp(target, first.current ? 1 : 1 - Math.exp(-delta * 7));
      target.copy(focus.current);
      if (game.weapon === "bow" || game.lockTarget) {
        target.x += Math.cos(game.cameraYaw) * 0.95;
        target.z -= Math.sin(game.cameraYaw) * 0.95;
      }
      const safe = cameraBoom(
        obstacles,
        target,
        game.cameraYaw,
        game.weapon === "bow" && !game.lockTarget
          ? game.cameraPitch
          : indoors
            ? frame.pitch
            : game.cameraPitch,
        game.aiming && !game.lockTarget
          ? 6.5
          : indoors
            ? frame.distance
            : game.cameraDistance,
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
        : responsiveFov(
            game.cameraSettings.fov + (game.zone === "office" ? 5 : 0),
            camera.aspect,
          );
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
    camera.lookAt(target);
    const aimDirection = new Vector3();
    camera.getWorldDirection(aimDirection);
    const end = camera.position.clone().addScaledVector(aimDirection, 55);
    // Cast from the hero's depth so a faded wall behind the hero cannot pull
    // the aim point backward when the camera moves outside the room shell.
    const heroDepth = new Vector3(game.x, game.y + 1.65, game.z)
      .sub(camera.position)
      .dot(aimDirection);
    const aimStart = camera.position
      .clone()
      .addScaledVector(aimDirection, Math.max(0, heroDepth));
    let fraction = 1;
    for (const c of game.colliders) {
      const t = rayFraction(c, aimStart, end);
      if (t !== null) fraction = Math.min(fraction, t);
    }
    const aim = aimStart.lerp(end, fraction);
    game.aimPoint.x = aim.x;
    game.aimPoint.y = aim.y;
    game.aimPoint.z = aim.z;
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
        args={[
          zone === "grounds" ? "#bddef0" : "#d8c7a1",
          zone === "grounds" ? 150 : 40,
          zone === "grounds" ? 2000 : 100,
        ]}
      />
      <ambientLight intensity={zone === "grounds" ? 0.8 : 1.1} />
      <hemisphereLight args={["#bac6ed", "#6b655c", 0.8]} />
      <directionalLight
        position={[-18, 28, 15]}
        intensity={1.8}
        color="#fff6e3"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-normalBias={0.06}
      />
      {zone === "grounds" ? (
        <>
          <AdventureSky />
          <Grounds />
          <Arrival />
        </>
      ) : (
        <Office />
      )}
      <Character />
      <CombatEffects />
      <RangedCombat />
      {zone === "office" && (
        <>
          <EnemyModel id={100} boss />
          <EnemyModel id={101} />
          <EnemyModel id={102} />
        </>
      )}
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
    pots = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (gems.current) gems.current.visible = game.phase !== "intro";
    gems.current?.children.forEach((child, i) => {
      child.visible = !game.items[i].collected;
      child.position.y = 1.05 + Math.sin(clock.elapsedTime * 2.5 + i) * 0.16;
      child.rotation.y = clock.elapsedTime + i;
    });
    pots.current?.children.forEach((child, i) => {
      child.visible = !game.pots[i].broken;
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
      {game.guards.map((g) => (
        <EnemyModel key={g.id} id={g.id} />
      ))}
    </>
  );
}
function DoorMarker() {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.visible =
        game.phase === "playing" &&
        (game.zone === "office" ? game.boss.hp <= 0 : game.gems >= 8);
      ref.current.position.set(
        0,
        3.8 + Math.sin(clock.elapsedTime * 2) * 0.15,
        game.zone === "office" ? -9.95 : -13.7,
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
  const [resolution, setResolution] = useState(1);
  return (
    <Canvas
      frameloop={game.phase === "title" ? "never" : "always"}
      shadows
      onCreated={({ scene, camera }) => {
        if (import.meta.env.DEV) {
          window.__scene = scene;
          window.__camera = camera;
        }
      }}
      dpr={resolution}
      camera={{ fov: 48, near: 0.1, far: 2400 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <AdaptiveResolution onChange={setResolution} />
      <Suspense fallback={null}>
        <Runtime />
      </Suspense>
    </Canvas>
  );
}
