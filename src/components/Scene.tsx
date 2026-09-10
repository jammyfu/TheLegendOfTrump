import { AdaptiveResolution } from "./AdaptiveResolution";
import { flushSync } from "react-dom";
import { getZoneLoading, setZoneLoading } from "../game/zoneLoading";
import { CameraOcclusion } from "./CameraOcclusion";
import { SpeedLines } from "./SpeedLines";
import { PickupPresentation } from "./PickupPresentation";
import { pickupEnvelope } from "../game/pickup";
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
import { Suspense, useEffect, useRef, useState, useSyncExternalStore, memo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { getLoadingState, subscribeLoading, markSceneReady } from "../game/loading";
import {
  Group,
  Vector3,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
} from "three";
import { game } from "../game/simulation";
import { getInput, releaseMouse, clearInput, updateMouseAim } from "../game/input";
import { playSound, rotorSound, syncActionAudio } from "../game/audio";
import { Grounds, Office } from "./World";
import { Character } from "./Character";
import { CharacterSun } from "./CharacterSun";
import { EnemyHealthBars } from "./EnemyHealthBars";
import { Box, Cylinder } from "./Primitives";
import {
  cameraBoom,
  constrainCamera,
  indoorFrame,
  cameraObstacles,
  recoverBoom,
  responsiveFov,
} from "../game/camera";
import { cameraFraction } from "../game/collision";
import { InteractiveProps } from "./InteractiveProps";
import { mobileRenderProfile, renderProfile } from "../game/renderQuality";
const desired = new Vector3(),
  target = new Vector3();
const Runtime = memo(RuntimeContent);
function RuntimeContent() {
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)'));
  const tension = useRef(0);
  const aircraftAvoidance = useRef<{yaw:number|null}>({yaw:null});
  const previousZone = useRef(game.zone);
  const previousPhase = useRef(game.phase);
  const [zone, setZone] = useState(game.zone);
  const first = useRef(true);
  useEffect(() => { first.current = true; }, [zone]);
  const boom = useRef(game.cameraDistance);
  const focus = useRef(new Vector3());
  useFrame(({ camera }, delta) => {
    if (!getZoneLoading()) updateMouseAim(delta);
    for (let remaining = getZoneLoading() ? 0 : Math.min(delta, 0.2); remaining > 0; remaining -= 0.05)
      game.update(Math.min(remaining, 0.05), getInput());
    const events = game.events.splice(0);
    for (const event of events) playSound(event);
    if (mobileRenderProfile && !reducedMotion.matches && game.cameraSettings.shake &&
        events.some(event => ["hurt", "hit", "heavy", "punchHit", "kickHit", "arrowHit", "block"].includes(event))) {
      // One pulse per frame even when a sweep hits a group. Unsupported iOS
      // browsers still receive the visual camera and damage overlay feedback.
      const pulse = events.includes("hurt") ? Math.round(35 * game.hurtFeedback)
        : events.includes("heavy") ? 28 : events.includes("block") ? 16
        : game.weapon === "none" ? 10 : game.swordUpgraded ? 18 : 12;
      try { navigator.vibrate?.(pulse); } catch { /* Optional device capability. */ }
    }
    syncActionAudio(game.phase !== "paused" && game.phase !== "title",
      game.phase === "playing" && game.weapon === "bow" && game.attackHeld,
      game.phase === "playing" && game.spinTime > 0,
      game.phase === "playing" && game.chargeTime > 0);
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
      const destination = game.zone;
      clearInput();
      // Paint the DOM cover before mounting/compiling the destination scene.
      flushSync(() => setZoneLoading(destination));
      requestAnimationFrame(() => requestAnimationFrame(() => setZone(destination)));
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
    } else if (
      game.zone === "office" &&
      (game.phase === "dialogue" || game.phase === "won")
    ) {
      desired.set(0, 5.8, -12);
      target.set(0, 3.8, -22.5);
    } else {
      const indoors = game.zone === "office";
      const cameraLock = game.weapon === "bow" ? undefined : game.lockTarget;
      const frame = indoorFrame(
        game,
        game.cameraYaw,
        game.cameraPitch,
        game.cameraDistance,
        cameraLock,
      );
      target.set(game.x, game.y + (indoors ? 2.3 : 1.9), game.z);
      const obstacles = cameraObstacles(game.colliders);
      if (indoors || cameraLock) {
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
      const nearAircraft = game.zone==='grounds' && Math.abs(game.x-LANDING.x)<13 && Math.abs(game.z-LANDING.z)<18;
      // A lagging/shoulder-offset focus can slip into the hull even when the
      // player is outside it, collapsing all outgoing obstruction rays.
      if(nearAircraft) focus.current.set(game.x,game.y+1.9,game.z);
      target.copy(focus.current);
      if (!nearAircraft && (game.weapon === "bow" || game.lockTarget)) {
        target.x += Math.cos(game.cameraYaw) * 0.95;
        target.z -= Math.sin(game.cameraYaw) * 0.95;
      }
      const safe = cameraBoom(
        obstacles,
        target,
        game.cameraYaw,
        game.weapon === "bow"
          ? game.cameraPitch
          : indoors
            ? frame.pitch
            : game.cameraPitch,
        game.aiming
          ? 6.5
          : indoors
            ? frame.distance
            : game.cameraDistance,
        aircraftAvoidance.current,
      );
      boom.current = first.current || aircraftAvoidance.current.yaw!==null
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
    if (game.phase === 'obtaining' && !reducedMotion.matches) {
      const mix = pickupEnvelope(game.pickupTime);
      desired.lerp(new Vector3(game.x+Math.sin(game.yaw+.25)*4.3,game.y+2.8,game.z+Math.cos(game.yaw+.25)*4.3),mix);
      target.lerp(new Vector3(game.x,game.y+2.6,game.z),mix);
    }
    if (game.phase !== "playing" && document.pointerLockElement) releaseMouse();
    const cinematic =
      game.phase === "title" ||
      game.phase === "intro" ||
      game.phase === "obtaining" ||
      game.phase === "dialogue" ||
      game.phase === "won";
    if (cinematic && game.phase !== 'intro')
      camera.position.lerp(
        desired,
        first.current ? 1 : 1 - Math.exp(-delta * 9),
      );
    else camera.position.copy(desired);
    // Final safety pass includes the indoor shell and the moving aircraft.
    // It runs after cinematic interpolation, not just on the intended endpoint.
    if (game.phase !== "title") {
      // Desk and chair use subject-aware fading instead of squeezing the camera
      // into the player's back; physical actor collisions remain unchanged.
      const volumes = game.colliders.filter((c) => !c.id.startsWith("guard-") &&
        !(c.zone==='office'&&(c.id==='desk'||c.id==='chair')));
      if (game.phase === "intro") {
        const p = introPose(game.introTime);
        volumes.push({
          id: "camera-aircraft",
          zone: "grounds",
          x: p.helicopter[0],
          z: p.helicopter[2],
          bottom: p.helicopter[1] - 0.6,
          top: p.helicopter[1] + 8,
          radius: 8.6,
        });
      }
      const safe = constrainCamera(volumes, target, camera.position);
      camera.position.set(safe.x, safe.y, safe.z);
    }
    if (camera instanceof PerspectiveCamera) {
      const fov = cinematic
        ? 48
        : responsiveFov(
            (game.cameraSettings.fov + (game.zone === "office" ? 5 : 0)) * (game.aiming ? 0.65 : 1),
            camera.aspect,
          );
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
    camera.lookAt(target);
    const aimDirection = new Vector3();
    camera.updateMatrixWorld();
    aimDirection.set(game.weapon === "bow" ? game.aimCursor.x : 0, game.weapon === "bow" ? game.aimCursor.y : 0, 0.5)
      .unproject(camera).sub(camera.position).normalize();
    const crosshair = document.getElementById("bow-crosshair");
    if (crosshair) {
      crosshair.style.left = `${(game.aimCursor.x + 1) * 50}%`;
      crosshair.style.top = `${(1 - game.aimCursor.y) * 50}%`;
    }
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
    let aimedId = "";
    for (const c of game.colliders) {
      const t = rayFraction(c, aimStart, end);
      if (t !== null && t < fraction) { fraction = t; aimedId = c.id; }
    }
    game.aimOnTarget = game.combatTargets.some(e => e.hp > 0 && aimedId === "guard-" + e.id);
    if (crosshair) {
      const focus = game.attackHeld ? game.bowDraw / 0.85 : 0;
      crosshair.style.setProperty("--aim-size", `${game.aimOnTarget ? 64 - focus * 42 : 100 - focus * 24}px`);
      crosshair.dataset.aligned = String(game.aimOnTarget);
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
      camera.rotateX(Math.sin(game.impactTime * 95) * 0.016 * strength);
      camera.rotateY(Math.sin(game.impactTime * 77) * 0.018 * strength);
      camera.rotateZ(Math.sin(game.impactTime * 61) * 0.007 * strength);
    }
    first.current = false;
  }, -1);
  return (
    <>
      <ZoneReady key={zone} zone={zone} />
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
      <CharacterSun zone={zone} />
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
      <EnemyHealthBars />
      <CombatEffects />
      <RangedCombat />
      {zone === "office" && (
        <>
          <EnemyModel id={100} boss />
          {game.minions.map(g=><EnemyModel key={g.id} id={g.id}/>)}
        </>
      )}
      {zone === "grounds" && (
        <>
          <Entities />
          <InteractiveProps />
        </>
      )}
      <DoorMarker />
      <CameraOcclusion />
      <SpeedLines />
      <PickupPresentation />
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
        // In the office, guide the player to the declaration on the desktop,
        // not to the interaction point on the floor in front of the desk.
        // The room is rendered at OFFICE_SCALE (2): declaration =
        // (0, 2.2, -4.65) with the desk's -5.25 z offset.
        game.zone === "office"
          ? 5.05 + Math.sin(clock.elapsedTime * 2) * 0.15
          : 3.8 + Math.sin(clock.elapsedTime * 2) * 0.15,
        game.zone === "office" ? -19.8 : -13.7,
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
/** Inside Suspense: report readiness only after the full scene's first render. */
function ZoneReady({ zone }: { zone: "office" | "grounds" }) {
  const committed = useRef(false);
  const frames = useRef(0);
  useEffect(() => {
    committed.current = true;
    return () => { committed.current = false; };
  }, []);
  useFrame(() => {
    if (getZoneLoading() !== zone || !committed.current) return;
    // Two completed render opportunities include texture upload and shaders.
    if (++frames.current === 3) {
      clearInput();
      setZoneLoading(null);
    }
  });
  return null;
}

function SceneReady() {
  const invalidate = useThree((state) => state.invalidate);
  const frame = useRef<number | null>(null);
  useEffect(() => {
    invalidate();
    const unsubscribe = subscribeLoading(invalidate);
    return () => {
      unsubscribe();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [invalidate]);
  useFrame(() => {
    if (frame.current === null && !getLoadingState().sceneReady) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        markSceneReady();
      });
    }
  });
  return null;
}

export function Scene() {
  const [resolution, setResolution] = useState(renderProfile.initialDpr);
  const loading = useSyncExternalStore(subscribeLoading, getLoadingState);
  return (
    <Canvas
      frameloop={game.phase === "title" ? (loading.sceneReady ? "never" : "demand") : "always"}
      shadows
      onCreated={({ scene, camera }) => {
        if (import.meta.env.DEV) {
          window.__scene = scene;
          window.__camera = camera;
        }
      }}
      dpr={resolution}
      camera={{ fov: 48, near: 0.1, far: renderProfile.cameraFar }}
      gl={{ antialias: !mobileRenderProfile, powerPreference: "high-performance", logarithmicDepthBuffer: true }}
    >
      <AdaptiveResolution onChange={setResolution} />
      <Suspense fallback={null}>
        <Runtime />
        <SceneReady />
      </Suspense>
    </Canvas>
  );
}
