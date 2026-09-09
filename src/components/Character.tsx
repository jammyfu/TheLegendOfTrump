import { DEATH, deathPose } from "../game/enemyMotion";
import { introPose } from "../game/intro";
import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Group,
  Mesh,
  Quaternion,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  ATTACKS,
  attackPose,
  SPIN,
  bladeDirection,
  swingProgress,
} from "../game/combat";
import { game } from "../game/simulation";
import { applyLegendMaterials } from "../game/materials";
import { AERIAL, aerialPose } from "../game/aerialCombat";
const UP = new Vector3(0, 1, 0);
function cloneGear(source: Group) {
  const clone = source.clone(true);
  applyLegendMaterials(clone);
  clone.traverse((node) => {
    if (node instanceof Mesh)
      node.material = Array.isArray(node.material)
        ? node.material.map((m) => m.clone())
        : node.material.clone();
  });
  return clone;
}
const MODEL_URL = import.meta.env.BASE_URL + "models/trump-n64.glb";
export function Character() {
  const root = useRef<Group>(null);
  const gripRotation = useMemo(() => new Quaternion(), []);
  const blade = useMemo(() => new Vector3(), []);
  const bladeRotation = useMemo(() => new Quaternion(), []);
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
  const bowSource = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/adventure-bow.glb",
  );
  const quiverSource = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/adventure-quiver.glb",
  );
  const bowString = useMemo(
    () =>
      new Line(
        new BufferGeometry().setFromPoints([
          new Vector3(0, -0.84, -0.12),
          new Vector3(0, 0, -0.12),
          new Vector3(0, 0.84, -0.12),
        ]),
        new LineBasicMaterial({ color: "#e4e4c3" }),
      ),
    [],
  );
  const nockedArrow = useMemo(
    () =>
      new Line(
        new BufferGeometry().setFromPoints([
          new Vector3(),
          new Vector3(0, 0, 0.8),
        ]),
        new LineBasicMaterial({ color: "#e0c493" }),
      ),
    [],
  );
  const gear = useMemo(
    () => ({
      bow: cloneGear(bowSource.scene),
      quiver: cloneGear(quiverSource.scene),
      sword: cloneGear(swordSource.scene),
      shield: cloneGear(shieldSource.scene),
    }),
    [swordSource, shieldSource, bowSource, quiverSource],
  );
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const model = useMemo(() => {
    const scene = gltf.scene.clone(true);
    applyLegendMaterials(scene);
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
    const defeated =
      game.phase === "dying" || (game.phase === "lost" && game.hp <= 0);
    const dying = deathPose(game.deathTime, DEATH.player);
    root.current.rotation.x = root.current.rotation.z = 0;
    const spinning = game.spinTime > 0;
    const spinProgress = spinning
      ? (SPIN.duration - game.spinTime) / SPIN.duration
      : 0;
    root.current.rotation.y =
      game.yaw + (spinning ? Math.PI * 2 * SPIN.turns * spinProgress : 0);
    root.current.visible =
      defeated ||
      game.dodgeTime > 0 ||
      game.invincible <= 0 ||
      Math.floor(game.invincible * 12) % 2 === 0;
    if (arrival) {
      root.current.position.set(...arrival.hero);
      root.current.visible = arrival.visible;
      root.current.rotation.y = arrival.walking ? arrival.heroHeading : Math.PI;
    }
    for (const part of Object.values(parts)) part.rotation.set(0, 0, 0);
    parts.leftKnee.rotation.x = Math.max(0, -walk) * 0.9;
    parts.rightKnee.rotation.x = Math.max(0, walk) * 0.9;
    parts.leftElbow.rotation.x = -0.12 - Math.abs(walk) * 0.4;
    parts.rightElbow.rotation.x = -0.12 - Math.abs(walk) * 0.4;
    // When a wall forces the camera inside the character, fade the body so it
    // cannot cover the view. Collision still determines the camera position.
    const distance = Math.hypot(
      camera.position.x - root.current.position.x,
      camera.position.y - root.current.position.y - 1.9,
      camera.position.z - root.current.position.z,
    );
    let opacity = seated ? 1 : Math.max(0, Math.min(1, (distance - 0.8) / 1.8));
    if (
      game.aiming &&
      game.lockTarget &&
      Math.hypot(game.lockTarget.x - game.x, game.lockTarget.z - game.z) < 3.4
    )
      opacity *= 0.45;
    for (const object of [
      model,
      gear.sword,
      gear.shield,
      gear.bow,
      gear.quiver,
    ])
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
      (attacking ||
        game.guarding ||
        game.comboWindow > 0 ||
        game.chargeTime > 0 ||
        spinning) &&
      !seated &&
      game.weapon === "sword";
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
    if (game.airAttack && attacking) {
      const pose = aerialPose(game.airAttack, AERIAL[game.airAttack].duration - game.attackTime);
      const strike = pose.strike;
      parts.head.rotation.y = 0;
      parts.leftArm.rotation.set(-0.7, 0, -0.35);
      parts.leftElbow.rotation.x = -1;
      if (game.airAttack === "flyingKick") {
        parts.waist.rotation.set(-0.25 - strike * 0.18, 0.12, -0.08);
        parts.rightLeg.rotation.x = -0.75 - strike * 1.05;
        parts.rightKnee.rotation.x = 1.1 * pose.load + 0.08;
        parts.leftLeg.rotation.x = 0.35;
        parts.leftKnee.rotation.x = 1.15;
        parts.rightArm.rotation.set(-0.8, 0, 0.4);
        parts.rightElbow.rotation.x = -1.1;
      } else {
        parts.waist.rotation.set(-0.12 + strike * 0.42, 0, 0);
        parts.rightArm.rotation.set(-2.8 + strike * 2.15, 0, -0.12);
        parts.rightElbow.rotation.set(-0.65 + strike * 0.5, 0, 0);
        parts.rightWrist.rotation.set(0, 0, 0);
        parts.rightLeg.rotation.x = -0.3;
        parts.leftLeg.rotation.x = 0.2;
        parts.rightKnee.rotation.x = 0.55;
        parts.leftKnee.rotation.x = 0.8;
      }
    }
    if (game.chargeTime > 0 || spinning) {
      parts.rightArm.rotation.set(-0.8, 0, -0.9);
      parts.rightElbow.rotation.set(-0.3, 0, 0);
      parts.rightWrist.rotation.set(0, 0, 0);
      parts.waist.rotation.set(0.12, spinning ? 0 : -0.5, 0);
      parts.leftArm.rotation.set(-0.3, 0, 0.5);
      parts.leftKnee.rotation.x = parts.rightKnee.rotation.x = 0.2;
    }
    if (slash.current) {
      const elapsed = game.meleeSpec.duration - game.attackTime;
      const hit = game.meleeSpec.hit;
      const sweep = swingProgress(game.combo, elapsed);
      slash.current.visible =
        attacking && elapsed > hit - 0.045 && elapsed < hit + 0.12;
      slash.current.rotation.set(
        game.combo === 0 ? 0 : Math.PI / 2,
        game.combo === 0 ? Math.PI / 2 : 0,
        game.combo === 0
          ? -sweep * Math.PI
          : (game.combo === 1 ? 1 : -1) * (sweep - 0.5) * Math.PI,
      );
    }
    gear.sword.visible = game.swordUnlocked && game.phase !== "intro";
    gear.shield.visible = game.shieldUnlocked && game.phase !== "intro";
    gear.sword.name = "EquippedSword";
    gear.shield.name = "EquippedShield";
    const swordParent = drawn ? parts.rightWrist : parts.torso;
    if (gear.sword.parent !== swordParent) swordParent.add(gear.sword);
    gear.sword.position.set(
      ...((drawn ? [-0.06, -0.19, 0.06] : [0.35, 2.05, -0.28]) as [
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
      ...((blocking ? [0.03, -0.08, 0.24] : [0, 1.5, -0.35]) as [
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
    const usingBow = game.weapon === "bow" && !seated && game.phase !== "intro";
    gear.bow.name = "EquippedBow";
    gear.quiver.name = "EquippedQuiver";
    gear.bow.visible = gear.quiver.visible =
      game.bowUnlocked && game.phase !== "intro";
    const bowParent = usingBow ? parts.leftWrist : parts.torso;
    if (gear.bow.parent !== bowParent) bowParent.add(gear.bow);
    if (gear.quiver.parent !== parts.torso) parts.torso.add(gear.quiver);
    gear.quiver.position.set(-0.42, 1.55, -0.48);
    gear.quiver.rotation.set(0, 0, -0.3);
    gear.bow.position.set(
      ...((usingBow ? [0, -0.2, 0.12] : [-0.35, 1.5, -0.56]) as [
        number,
        number,
        number,
      ]),
    );
    gear.bow.rotation.set(0, 0, usingBow ? 0 : -0.4);
    if (bowString.parent !== gear.bow) {
      gear.bow.add(bowString);
      gear.bow.add(nockedArrow);
    }
    const draw = game.bowDraw / 0.85;
    const positions = bowString.geometry.attributes.position;
    positions.setXYZ(1, 0, 0, -0.12 - draw * 0.55);
    positions.needsUpdate = true;
    bowString.geometry.computeBoundingSphere();
    nockedArrow.visible = usingBow && game.attackHeld;
    nockedArrow.position.set(0, 0, -0.12 - draw * 0.55);
    if (usingBow && game.dodgeTime <= 0) {
      parts.leftArm.rotation.set(-1.45, -0.25, -0.4);
      parts.leftElbow.rotation.set(-0.08, 0, 0);
      parts.rightArm.rotation.set(-1.2, 0.5, 0.55);
      parts.rightElbow.rotation.set(-0.35 - draw * 1.0, 0, 0);
      parts.waist.rotation.y = -0.16 * draw;
      parts.head.rotation.y = 0.16 * draw;
      root.current.updateMatrixWorld(true);
      parts.leftWrist.getWorldQuaternion(gripRotation).invert();
      uprightRotation.setFromAxisAngle(UP, root.current.rotation.y);
      gear.bow.quaternion.copy(gripRotation).multiply(uprightRotation);
    }
    if (!game.grounded && !game.airAttack) {
      parts.leftLeg.rotation.x = -0.45;
      parts.rightLeg.rotation.x = 0.3;
    }
    if (!drawn)
      parts.waist.rotation.x =
        game.dodgeTime > 0 ? 0.65 : game.sprinting ? 0.16 : 0;
    if (game.dodgeTime > 0) {
      const progress = 1 - game.dodgeTime / 0.55;
      root.current.rotation.y = Math.atan2(game.dodgeX, game.dodgeZ);
      parts.waist.rotation.x = Math.PI * 2 * progress;
      parts.leftLeg.rotation.x = parts.rightLeg.rotation.x = -0.8;
      parts.leftKnee.rotation.x = parts.rightKnee.rotation.x = 1.6;
      parts.leftArm.rotation.x = parts.rightArm.rotation.x = -1.1;
    }
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
    if (defeated) {
      root.current.rotation.z = -1.48 * dying.fall;
      root.current.position.y += 0.45 * dying.fall;
      parts.leftArm.rotation.x = parts.rightArm.rotation.x = -0.7;
      parts.leftKnee.rotation.x = parts.rightKnee.rotation.x = 0.8 * dying.fall;
    }
    if (drawn) {
      root.current.updateMatrixWorld(true);
      parts.rightWrist.getWorldQuaternion(gripRotation).invert();
      if (game.airAttack === "jumpSlash" && attacking) {
        const p = aerialPose("jumpSlash", AERIAL.jumpSlash.duration - game.attackTime);
        const angle = p.strike * Math.PI * 0.85;
        blade.set(0, Math.cos(angle), Math.sin(angle));
      } else if (attacking)
        blade
          .set(
            ...bladeDirection(
              game.combo,
              ATTACKS[game.combo].duration - game.attackTime,
            ),
          )
          .normalize();
      else if (spinning || game.chargeTime > 0)
        blade.set(-1, 0.12, 0.35).normalize();
      else blade.copy(UP);
      bladeRotation.setFromUnitVectors(UP, blade);
      uprightRotation
        .setFromAxisAngle(UP, root.current.rotation.y)
        .multiply(bladeRotation);
      gear.sword.quaternion.copy(gripRotation).multiply(uprightRotation);
    }
    if (!drawn)
      parts.waist.rotation.z = game.moving
        ? Math.sin(game.elapsed * 6) * 0.025
        : Math.sin(clock.elapsedTime * 1.5) * 0.007;
  });
  return (
    <group ref={root} name="hero-model" scale={0.92}>
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
