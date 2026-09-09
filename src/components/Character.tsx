import { introPose } from "../game/intro";
import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Group, Mesh, Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ATTACKS, attackPose } from "../game/combat";
import { game } from "../game/simulation";
const UP = new Vector3(0, 1, 0);
const MODEL_URL = import.meta.env.BASE_URL + "models/trump-n64.glb";
export function Character() {
  const root = useRef<Group>(null);
  const gripRotation = useMemo(() => new Quaternion(), []);
  const uprightRotation = useMemo(() => new Quaternion(), []);
  const slash = useRef<Mesh>(null);
  const swordSource = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/hero-sword.glb",
  );
  const shieldSource = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/hero-shield.glb",
  );
  const gear = useMemo(
    () => ({
      sword: swordSource.scene.clone(true),
      shield: shieldSource.scene.clone(true),
    }),
    [swordSource, shieldSource],
  );
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const model = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse((node) => {
      if (node instanceof Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return scene;
  }, [gltf]);
  const parts = useMemo(
    () => ({
      leftLeg: model.getObjectByName("LeftLegPivot")!,
      rightLeg: model.getObjectByName("RightLegPivot")!,
      leftArm: model.getObjectByName("LeftArmPivot")!,
      rightArm: model.getObjectByName("RightArmPivot")!,
      leftElbow: model.getObjectByName("LeftElbowPivot")!,
      rightElbow: model.getObjectByName("RightElbowPivot")!,
      leftWrist: model.getObjectByName("LeftWristPivot")!,
      rightWrist: model.getObjectByName("RightWristPivot")!,
      leftKnee: model.getObjectByName("LeftKneePivot")!,
      rightKnee: model.getObjectByName("RightKneePivot")!,
      waist: model.getObjectByName("WaistPivot")!,
      head: model.getObjectByName("HeadPivot")!,
      sword: model.getObjectByName("SwordPivot")!,
      torso: model.getObjectByName("TorsoPivot")!,
    }),
    [model],
  );
  useFrame(({ clock, camera }) => {
    if (!root.current) return;
    const seated =
      game.zone === "office" &&
      (game.phase === "dialogue" || game.phase === "won");
    const arrival = game.phase === "intro" ? introPose(game.introTime) : null;
    const walk = arrival
      ? arrival.walking
        ? Math.sin(arrival.t * 10) * 0.48
        : 0
      : game.moving
        ? Math.sin(game.elapsed * 12) * 0.48
        : 0;
    root.current.position.set(
      game.x,
      seated
        ? 0.35
        : game.y +
            (game.moving ? Math.abs(Math.sin(game.elapsed * 12)) * 0.045 : 0),
      game.z,
    );
    root.current.rotation.y = game.yaw;
    root.current.visible =
      game.invincible <= 0 || Math.floor(game.invincible * 12) % 2 === 0;
    if (arrival) {
      root.current.position.set(...arrival.hero);
      root.current.visible = arrival.visible;
      root.current.rotation.y = arrival.walking ? Math.PI / 2 : Math.PI;
    }
    for (const part of Object.values(parts)) part.rotation.set(0, 0, 0);
    parts.leftKnee.rotation.x = Math.max(0, -walk) * 0.9;
    parts.rightKnee.rotation.x = Math.max(0, walk) * 0.9;
    parts.leftElbow.rotation.x = -0.12 - Math.abs(walk) * 0.4;
    parts.rightElbow.rotation.x = -0.12 - Math.abs(walk) * 0.4;
    // When a wall forces the camera inside the character, fade the body so it
    // cannot cover the view. Collision still determines the camera position.
    const distance = Math.hypot(
      camera.position.x - game.x,
      camera.position.y - game.y - 1.9,
      camera.position.z - game.z,
    );
    const opacity =
      seated || game.phase === "intro"
        ? 1
        : Math.max(0, Math.min(1, (distance - 0.8) / 1.8));
    for (const object of [model, gear.sword, gear.shield])
      object.traverse((node) => {
        if (node instanceof Mesh)
          for (const material of Array.isArray(node.material)
            ? node.material
            : [node.material]) {
            if (material.transparent !== opacity < 1) {
              material.transparent = opacity < 1;
              material.needsUpdate = true;
            }
            material.opacity = opacity;
            material.depthWrite = opacity > 0.95;
          }
      });
    parts.leftLeg.rotation.x = walk;
    parts.rightLeg.rotation.x = -walk;
    parts.leftArm.rotation.x = -walk;
    parts.rightArm.rotation.x = walk;
    parts.sword.visible = false;
    const attacking = game.attackTime > 0 && !seated;
    const drawn =
      (attacking || game.guarding || game.comboWindow > 0) && !seated;
    const blocking = game.guarding && !seated;
    if (drawn) {
      const pose = attackPose(
        game.combo,
        attacking
          ? ATTACKS[game.combo].duration - game.attackTime
          : ATTACKS[game.combo].duration,
      );
      parts.rightArm.rotation.set(...pose.shoulder);
      parts.rightElbow.rotation.set(...pose.elbow);
      parts.rightWrist.rotation.set(...pose.wrist);
      parts.waist.rotation.set(...pose.waist);
      parts.head.rotation.y = -pose.waist[1] * 0.45;
      parts.leftArm.rotation.set(-0.3, 0, 0.3);
      parts.leftElbow.rotation.x = -0.5;
      parts.rightKnee.rotation.x = 0.16;
      parts.leftKnee.rotation.x = game.combo === 2 ? 0.25 : 0.08;
    }
    if (slash.current) {
      const elapsed = ATTACKS[game.combo].duration - game.attackTime;
      const hit = ATTACKS[game.combo].hit;
      slash.current.visible =
        attacking && elapsed > hit - 0.035 && elapsed < hit + 0.1;
      slash.current.rotation.set(
        game.combo === 2 ? 0 : Math.PI / 2,
        game.combo === 2 ? Math.PI / 2 : 0,
        game.combo === 1 ? Math.PI : 0,
      );
    }
    gear.sword.name = "EquippedSword";
    gear.shield.name = "EquippedShield";
    const swordParent = drawn ? parts.rightWrist : parts.torso;
    if (gear.sword.parent !== swordParent) swordParent.add(gear.sword);
    gear.sword.position.set(
      ...((drawn ? [-0.06, -0.19, 0.06] : [0.35, 2.05, -0.43]) as [
        number,
        number,
        number,
      ]),
    );
    gear.sword.rotation.set(
      ...((drawn ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI - 0.5]) as [
        number,
        number,
        number,
      ]),
    );
    const shieldParent = blocking ? parts.leftWrist : parts.torso;
    if (gear.shield.parent !== shieldParent) shieldParent.add(gear.shield);
    gear.shield.position.set(
      ...((blocking ? [0.03, -0.08, 0.24] : [0, 1.5, -0.55]) as [
        number,
        number,
        number,
      ]),
    );
    gear.shield.rotation.set(
      ...((blocking ? [1.35, 0, -0.15] : [0, Math.PI, 0.18]) as [
        number,
        number,
        number,
      ]),
    );
    if (blocking) {
      parts.leftArm.rotation.x = -0.65;
      parts.leftElbow.rotation.x = -0.7;
      parts.leftArm.rotation.z = 0.1;
    } else parts.leftArm.rotation.z = 0;
    if (!game.grounded) {
      parts.leftLeg.rotation.x = -0.45;
      parts.rightLeg.rotation.x = 0.3;
    }
    if (!drawn)
      parts.waist.rotation.x =
        game.dodgeTime > 0 ? 0.65 : game.sprinting ? 0.16 : 0;
    if (seated) {
      parts.leftLeg.rotation.x = -1.2;
      parts.rightLeg.rotation.x = -1.2;
      parts.leftArm.rotation.x = -1.4;
      parts.rightArm.rotation.x =
        -1.4 + Math.sin(clock.elapsedTime * 7) * 0.035;
      parts.rightArm.rotation.z = -0.1;
      parts.leftKnee.rotation.x = 1.2;
      parts.rightKnee.rotation.x = 1.2;
    }
    if (drawn && !attacking) {
      root.current.updateMatrixWorld(true);
      parts.rightWrist.getWorldQuaternion(gripRotation).invert();
      uprightRotation.setFromAxisAngle(UP, game.yaw);
      gear.sword.quaternion.copy(gripRotation).multiply(uprightRotation);
    }
    if (!drawn)
      parts.waist.rotation.z = game.moving
        ? Math.sin(game.elapsed * 6) * 0.025
        : Math.sin(clock.elapsedTime * 1.5) * 0.007;
  });
  return (
    <group ref={root} scale={0.92}>
      <primitive object={model} />
      <mesh
        ref={slash}
        name="sword-trail"
        position={[0, 1.5, 1.1]}
        visible={false}
      >
        <torusGeometry args={[1.15, 0.035, 4, 24, Math.PI * 1.15]} />
        <meshBasicMaterial
          color="#fff1aa"
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
useLoader.preload(GLTFLoader, MODEL_URL);
