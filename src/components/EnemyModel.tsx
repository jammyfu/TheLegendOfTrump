import { useMemo, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Group, Mesh, MeshStandardMaterial, type Material } from "three";
import { game } from "../game/simulation";
export function EnemyModel({
  id,
  boss = false,
}: {
  id: number;
  boss?: boolean;
}) {
  const ref = useRef<Group>(null),
    warning = useRef<Mesh>(null),
    wave = useRef<Mesh>(null);
  const source = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL +
      "models/" +
      (boss ? "iron-chancellor" : "palace-sentinel") +
      ".glb",
  );
  const model = useMemo(() => {
    const m = source.scene.clone(true);
    m.traverse((n) => {
      if (n instanceof Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        const cloneMaterial = (v: Material) => {
          const a = v.clone();
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
  }, [source]);
  const prefix = boss ? "Boss" : "Sentinel";
  const joints = useMemo(
    () =>
      Object.fromEntries(
        [
          "Weapon",
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
    const alive = g.hp > 0;
    const stunned = boss ? game.boss.stagger : guard!.stun;
    const flash = boss ? game.boss.flash : guard!.hitFlash;
    const windup = boss ? game.boss.state === "windup" : guard!.windup > 0;
    ref.current.visible = game.phase !== "intro" && (alive || g.defeatTime > 0);
    ref.current.position.set(g.x, 0, g.z);
    const recoil = boss
      ? Math.min(1, stunned / 0.36)
      : guard!.stunDuration > 0
        ? stunned / guard!.stunDuration
        : 0;
    ref.current.rotation.set(
      -Math.sin(recoil * Math.PI * 0.7) * 0.4,
      g.yaw,
      alive ? 0 : (1 - g.defeatTime / (boss ? 1.2 : 0.65)) * 1.5,
    );
    const walk =
      alive &&
      !windup &&
      stunned === 0 &&
      (!boss || game.boss.state === "chase")
        ? Math.sin(game.elapsed * 8) * 0.22
        : 0;
    for (const j of Object.values(joints)) j.rotation.set(0, 0, 0);
    joints.RightLeg.rotation.x = walk;
    joints.LeftLeg.rotation.x = -walk;
    joints.RightKnee.rotation.x = Math.max(0, -walk);
    joints.LeftKnee.rotation.x = Math.max(0, walk);
    joints.RightArm.rotation.x = windup ? -1.8 : walk;
    joints.RightElbow.rotation.x = windup ? -0.3 : 0;
    joints.LeftArm.rotation.x = -0.4;
    joints.LeftElbow.rotation.x = -0.35;
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
        joints.RightArm.rotation.x = b.move === "sweep" ? -1.3 : -2.3;
        joints.Torso.rotation.y = b.move === "sweep" ? -0.55 : 0;
      } else if (b.state === "recover") {
        const duration = b.enraged ? 0.85 : 1.2;
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
    joints.Weapon.rotation.x =
      weaponPitch - joints.RightArm.rotation.x - joints.RightElbow.rotation.x;
    model.traverse((n) => {
      if (n instanceof Mesh)
        for (const m of Array.isArray(n.material) ? n.material : [n.material])
          if (m instanceof MeshStandardMaterial) {
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
      const r = boss ? (game.boss.move === "sweep" ? 3.8 : 3.1) : 2.1;
      warning.current.scale.set(r, r, 1);
      (warning.current.material as MeshStandardMaterial).color.set(
        boss && game.boss.move !== "sweep" ? "#ff4534" : "#ffc757",
      );
    }
    if (wave.current) {
      wave.current.visible = boss && game.boss.wave >= 0;
      const dx = game.boss.waveX - g.x,
        dz = game.boss.waveZ - g.z;
      wave.current.position.set(
        dx * Math.cos(g.yaw) - dz * Math.sin(g.yaw),
        0.16,
        dx * Math.sin(g.yaw) + dz * Math.cos(g.yaw),
      );
      wave.current.scale.setScalar(Math.max(0.01, game.boss.wave));
    }
  });
  return (
    <group ref={ref} name={`guard-${id}`}>
      <primitive object={model} />
      <mesh
        ref={warning}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.075, 0]}
        visible={false}
      >
        <ringGeometry args={[0.87, 1, 48]} />
        <meshBasicMaterial
          color="#ff7040"
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>
      {boss && (
        <mesh ref={wave} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.92, 1, 64]} />
          <meshBasicMaterial
            color="#ff7c32"
            transparent
            opacity={0.8}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
