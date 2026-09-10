import { DEATH, deathPose, enemyAttackPose } from "../game/enemyMotion";
import { ENEMY_RULES, enemyScale } from "../game/expedition";
import { useMemo, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Group, Mesh, MeshStandardMaterial, Vector3, type Material } from "three";
import { BOSS_SLAM, hammerContactAngles } from "../game/bossHammer";
import { bindBossHammer, poseBossWrist } from "../game/bossGrip";
import { game } from "../game/simulation";
import { legendMaterial, ensureNormalUVs } from "../game/materials";
import { ensureSurfaceUVs } from "../game/surfaceUV";
import { surfaceFor } from "../game/surfaceCatalog";
export function EnemyModel({
  id,
  boss = false,
}: {
  id: number;
  boss?: boolean;
}) {
  const kind = game.activeGuards.find((g) => g.id === id)?.kind ?? "sentinel";
  const ref = useRef<Group>(null),
    warning = useRef<Mesh>(null);
  const lastPosition = useRef({ x: 0, z: 0, ready: false });
  const contactTarget = useMemo(() => new Vector3(), []);
  const source = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL +
      "models/" +
      (boss
        ? "iron-chancellor"
        : kind === "sentinel"
          ? "palace-sentinel"
          : "field-" + kind) +
      ".glb",
  );
  const model = useMemo(() => {
    const m = source.scene.clone(true);
    if (boss) bindBossHammer(m);
    m.traverse((n) => {
      if (n instanceof Mesh) {
        const original = Array.isArray(n.material) ? n.material[0] : n.material;
        if (original instanceof MeshStandardMaterial && !original.map) ensureSurfaceUVs(n, surfaceFor(original.name, n.name));
        else ensureNormalUVs(n);
        n.castShadow = true;
        n.receiveShadow = true;
        const cloneMaterial = (v: Material) => {
          const a = legendMaterial(v, n.name);
          if (a instanceof MeshStandardMaterial)
            a.userData.baseEmission = a.emissive.getHex();
          return a;
        };
        n.material = Array.isArray(n.material)
          ? n.material.map(cloneMaterial)
          : cloneMaterial(n.material);
      }
    });
    return m;
  }, [source,boss]);
  const prefix = boss ? "Boss" : "Sentinel";
  const joints = useMemo(
    () =>
      Object.fromEntries(
        [
          "Weapon",
          ...(boss ? ["RightHand"] : []),
          "Torso",
          "RightArm",
          "LeftArm",
          "RightElbow",
          "LeftElbow",
          "RightLeg",
          "LeftLeg",
          "RightKnee",
          "LeftKnee",
        ].map((n) => [n, model.getObjectByName(prefix + n)!]),
      ),
    [model, prefix],
  );
  useFrame(() => {
    if (!ref.current) return;
    const guard = game.activeGuards.find((g) => g.id === id);
    const g = boss ? game.boss : guard;
    if (!g) {
      ref.current.visible = false;
      return;
    }
    if (!boss && Math.hypot(g.x - game.x, g.z - game.z) > 75) {
      ref.current.visible = false;
      return;
    }
    const alive = g.hp > 0;
    const stunned = boss ? game.boss.stagger : guard!.stun;
    const flash = boss ? game.boss.flash : guard!.hitFlash;
    const windup = boss ? game.boss.state === "windup" : guard!.windup > 0;
    const recovering = !boss && guard!.attackTime > 0;
    ref.current.visible = game.phase !== "intro" && (alive || g.defeatTime > 0);
    const death = deathPose(g.defeatTime, boss ? DEATH.boss : DEATH.enemy);
    const size = boss ? 2 : enemyScale(guard!);
    model.scale.setScalar(size);
    ref.current.position.set(g.x, alive ? 0 : 0.45 * size * death.fall, g.z);
    const recoil = boss
      ? Math.min(1, stunned / 0.36)
      : guard!.stunDuration > 0
        ? stunned / guard!.stunDuration
        : 0;
    ref.current.rotation.set(
      -Math.sin(recoil * Math.PI * 0.7) * 0.4,
      g.yaw,
      alive ? 0 : death.fall * 1.48,
    );
    const moved =
      lastPosition.current.ready &&
      Math.hypot(g.x - lastPosition.current.x, g.z - lastPosition.current.z) >
        0.0005;
    lastPosition.current = { x: g.x, z: g.z, ready: true };
    const walk =
      alive &&
      game.phase === "playing" &&
      !windup &&
      !recovering &&
      stunned === 0 &&
      moved &&
      (!boss || game.boss.state === "chase")
        ? Math.sin(game.elapsed * (boss && game.boss.pursuingSlam ? 13 * game.boss.boostSpeed : kind === "brute" ? 7 : 9)) *
          (boss && game.boss.pursuingSlam ? .5 : kind === "brute" ? .25 : .32)
        : 0;
    for (const j of Object.values(joints)) j.rotation.set(0, 0, 0);
    joints.RightLeg.rotation.x = walk;
    joints.LeftLeg.rotation.x = -walk;
    joints.RightKnee.rotation.x = Math.max(0, -walk) * 1.15;
    joints.LeftKnee.rotation.x = Math.max(0, walk) * 1.15;
    joints.RightArm.rotation.x = walk * 0.72 - 0.18;
    joints.RightElbow.rotation.x = -0.2 - Math.max(0, walk) * 0.35;
    joints.LeftArm.rotation.x = -walk * 0.72 - 0.26;
    joints.LeftElbow.rotation.x = -0.3 - Math.max(0, -walk) * 0.35;
    joints.Torso.rotation.y = walk * 0.16;
    if (!boss && (windup || recovering)) {
      const pose = enemyAttackPose(
        kind,
        guard!.windup,
        ENEMY_RULES[kind].windup,
        guard!.attackTime,
      );
      joints.Torso.rotation.set(...pose.torso);
      joints.RightArm.rotation.set(...pose.rightArm);
      joints.RightElbow.rotation.set(...pose.rightElbow);
      joints.LeftArm.rotation.set(...pose.leftArm);
      joints.LeftElbow.rotation.set(...pose.leftElbow);
      joints.Weapon.rotation.set(...pose.weapon);
      joints.RightLeg.rotation.x = kind === "brute" ? -0.18 : -0.1;
      joints.LeftLeg.rotation.x = kind === "brute" ? 0.24 : 0.14;
      joints.RightKnee.rotation.x = 0.2;
      joints.LeftKnee.rotation.x = 0.12;
    }
    if (boss && game.summonTime > 0) {
      joints.LeftArm.rotation.x = -2.4;
      joints.RightArm.rotation.x = -2.4;
    }
    // Wind-up carries the weapon upright above the hand. Recovery begins with
    // the actual sweep/downstroke, then settles back into the ready stance.
    let weaponPitch = 0;
    if (boss) {
      const b = game.boss;
      if (windup) {
        joints.RightArm.rotation.x =
          b.move === "dart" ? -1.55 : b.move === "sweep" ? -1.3 : -2.3;
        joints.Torso.rotation.y = b.move === "sweep" ? -0.55 : 0;
      } else if (b.state === "recover") {
        const duration = b.recoveryDuration;
        const elapsed = Math.max(0, duration - b.timer);
        const follow = Math.max(0, 1 - elapsed / duration);
        const strike = Math.min(1, elapsed / 0.12);
        joints.RightArm.rotation.x = (-2.3 + strike * 1.4) * follow;
        weaponPitch = (b.move === "sweep" ? 1.1 : 2.15) * strike * follow;
        joints.Torso.rotation.y =
          b.move === "sweep" ? (-0.55 + strike * 1.3) * follow : 0;
        joints.Torso.rotation.x =
          b.move !== "sweep" ? 0.2 * strike * follow : 0;
      }
    }
    if (boss) poseBossWrist(joints.RightHand,weaponPitch,.45);
    if (boss && game.boss.pursuingSlam) {
      joints.Torso.rotation.x = game.boss.boostTime > 1.2 ? .32 : .14 + (game.boss.boostSpeed - 1) * .2;
      joints.RightArm.rotation.x = -1.45;
      joints.RightElbow.rotation.x = -.65;
      joints.LeftArm.rotation.x = -.65 - walk;
    }
    if (boss && game.boss.move === "slam" && (windup || game.boss.state === "recover")) {
      const b = game.boss;
      const elapsed = b.recoveryDuration - b.timer;
      const settle = windup ? 0 : Math.max(0, Math.min(1, (elapsed - .16) / (b.recoveryDuration - .16)));
      const rest = settle * settle * (3 - 2 * settle);
      const strike = windup ? Math.max(0, 1 - b.timer / BOSS_SLAM.swing) ** 2 : 1;
      const duration = b.enraged ? BOSS_SLAM.enragedWindup : BOSS_SLAM.windup;
      const lift = windup ? Math.min(1, Math.max(0, (duration - b.timer) / .36)) : 1;
      const raised = -.6 - 1.7 * lift * lift * (3 - 2 * lift);
      joints.Torso.rotation.set(.18 * strike * (1 - rest), 0, 0);
      ref.current.updateMatrixWorld(true);
      contactTarget.set(b.slamX, .7, b.slamZ);
      joints.RightArm.parent!.worldToLocal(contactTarget);
      contactTarget.sub(joints.RightArm.position);
      const contact = hammerContactAngles(contactTarget.y, contactTarget.z);
      // The downstroke is completed at timer=0, exactly when damage and the
      // ground burst fire. The extended hammer is part of the joint solve.
      joints.RightArm.rotation.set((raised + (contact.shoulder - raised) * strike) * (1 - rest) - .18 * rest, 0, 0);
      joints.RightElbow.rotation.set(contact.elbow * strike * (1 - rest) - .2 * rest, 0, 0);
      poseBossWrist(joints.RightHand,
        (-raised * (1 - strike) + Math.PI * strike) * (1 - rest),
        .45 * (1 - strike * (1 - rest)));
      joints.LeftArm.rotation.set(-1.3 * (1 - strike) * (1 - rest) - .4, 0, -.25 * strike);
      joints.LeftElbow.rotation.x = -.75 * (1 - rest);
      joints.RightLeg.rotation.x = -.15 * (1 - rest);
      joints.LeftLeg.rotation.x = .2 * (1 - rest);
      joints.RightKnee.rotation.x = joints.LeftKnee.rotation.x = .24 * strike * (1 - rest);
    }
    if (!boss && kind === "archer") {
      const bow = model.getObjectByName("ArcherBow");
      if (bow) bow.rotation.x = -joints.LeftArm.rotation.x;
    }
    if (!alive) {
      joints.LeftArm.rotation.x = joints.RightArm.rotation.x = -0.6;
      joints.LeftKnee.rotation.x = joints.RightKnee.rotation.x =
        0.7 * death.fall;
    }
    model.traverse((n) => {
      if (n instanceof Mesh)
        for (const m of Array.isArray(n.material) ? n.material : [n.material])
          if (m instanceof MeshStandardMaterial) {
            if (m.transparent !== !alive) {
              m.transparent = !alive;
              m.needsUpdate = true;
            }
            m.opacity = alive ? 1 : death.opacity;
            m.depthWrite = alive || death.opacity > 0.95;
            m.emissive.setHex(
              flash > 0 ? 0xffba60 : (m.userData.baseEmission ?? 0),
            );
            m.emissiveIntensity = flash > 0 ? 0.7 : 1;
            if (boss && n.name === "BossCore") {
              m.emissive.set(game.boss.enraged ? "#ff7628" : "#44dfff");
              m.color.copy(m.emissive);
            }
          }
    });
    if (warning.current) {
      warning.current.visible = alive && windup;
      const r = boss
        ? game.boss.move === "sweep"
          ? 3.8
          : game.boss.move === "slam" ? BOSS_SLAM.radius : 3.1
        : kind === "archer"
          ? 7.5
          : 2.1 * enemyScale(guard!);
      warning.current.scale.set(r, r, 1);
      warning.current.position.set(boss && game.boss.move === "slam" ? BOSS_SLAM.side : 0,
        .2, boss && game.boss.move === "slam" ? BOSS_SLAM.forward : 0);
      (warning.current.material as MeshStandardMaterial).color.set(
        boss && game.boss.move !== "sweep"
          ? "#ff4534"
          : kind === "archer"
            ? "#ff8574"
            : "#ffc757",
      );
      const material = warning.current.material as MeshStandardMaterial;
      // A paced pulse makes enemy anticipation readable at a glance without
      // adding a permanently bright decal beneath every hostile.
      const pulse = 0.84 + Math.sin(game.elapsed * 15) * 0.16;
      if (!boss || game.boss.move !== "slam") warning.current.scale.multiplyScalar(pulse);
      material.opacity = boss ? 0.38 + pulse * 0.28 : 0.22 + pulse * 0.18;
    }
  }, -0.1); // Animate before world-space weapon trails sample the joints.
  return (
    <group ref={ref} name={`guard-${id}`}>
      <primitive object={model} />
      {!boss && (
        <mesh
          ref={warning}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.075, 0]}
          visible={false}
        >
          <circleGeometry args={[1, 32, -Math.PI * 0.75, Math.PI * 0.5]} />
          <meshBasicMaterial
            color="#ff7040"
            transparent
            opacity={0.36}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
