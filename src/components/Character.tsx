import { rushPose, shieldBracePose } from "../game/rush";
import { fitHand, fitShieldHand } from "../game/handGrip";
import { DEATH, deathPose } from "../game/enemyMotion";
import { introPose } from "../game/intro";
import { useEffect, useMemo, useRef } from "react";
import { mountEquipmentTier } from "../game/equipmentVisual";
import { pickupEnvelope } from "../game/pickup";
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
} from "../game/combat";
import { game } from "../game/simulation";
import { locomotionPose, rollPose } from "../game/characterMotion";
import {
  HEAVY_PUNCH,
  HEAVY_PUNCH_STAGE,
  UNARMED,
  heavyPunchPose,
  unarmedPose,
} from "../game/unarmed";
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
  const motionPivot = useRef<Group>(null);
  const handTarget = useMemo(() => new Vector3(), []);
  const handOrientation = useMemo(() => new Quaternion(), []);
  const gripRotation = useMemo(() => new Quaternion(), []);
  const blade = useMemo(() => new Vector3(), []);
  const bladeRotation = useMemo(() => new Quaternion(), []);
  const uprightRotation = useMemo(() => new Quaternion(), []);
  const slash = useRef<Mesh>(null);
  const strideClock = useRef(0);
  const lastPosition = useRef<[number, number]>([game.x, game.z]);
  const woodSword = useLoader(GLTFLoader, import.meta.env.BASE_URL + "models/wood-sword.glb");
  const woodShield = useLoader(GLTFLoader, import.meta.env.BASE_URL + "models/wood-shield.glb");
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
      sword: new Group(),
      shield: new Group(),
      woodSword: cloneGear(woodSword.scene),
      metalSword: cloneGear(swordSource.scene),
      woodShield: cloneGear(woodShield.scene),
      metalShield: cloneGear(shieldSource.scene),
    }),
    [swordSource, shieldSource, bowSource, quiverSource, woodSword, woodShield],
  );
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  useEffect(() => () => {
    for (const item of [gear.sword, gear.shield, gear.bow, gear.quiver]) item.removeFromParent();
  }, [gear]);
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
    if (!root.current || !motionPivot.current) return;
    const seated =
      game.zone === "office" &&
      (game.phase === "dialogue" || game.phase === "won");
    const arrival = game.phase === "intro" ? introPose(game.introTime) : null;
    const travelled = Math.hypot(game.x-lastPosition.current[0], game.z-lastPosition.current[1]);
    lastPosition.current = [game.x, game.z];
    if (travelled < 1 && game.grounded && game.dodgeTime <= 0)
      strideClock.current += travelled * (game.sprinting ? 14.5 / 9.5 : 10.5 / 5.6);
    const gait = locomotionPose(
      arrival ? arrival.t : strideClock.current / (game.sprinting ? 14.5 : 10.5),
      arrival ? arrival.walking : game.moving && game.grounded && game.phase === "playing",
      arrival ? false : game.sprinting,
    );
    root.current.position.set(
      game.x,
      seated ? 2.05 : game.y + (game.dodgeTime > 0 || game.rush ? 0 : gait.bob),
      game.z,
    );
    const defeated =
      game.phase === "dying" || (game.phase === "lost" && game.hp <= 0);
    const dying = deathPose(game.deathTime, DEATH.player);
    root.current.rotation.x = root.current.rotation.z = 0;
    motionPivot.current.position.y = 1.08;
    motionPivot.current.rotation.set(0, 0, 0);
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
    parts.leftKnee.rotation.x = gait.leftKnee;
    parts.rightKnee.rotation.x = gait.rightKnee;
    parts.leftElbow.rotation.x = gait.leftElbow;
    parts.rightElbow.rotation.x = gait.rightElbow;
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
    parts.leftLeg.rotation.x = gait.leftLeg;
    parts.rightLeg.rotation.x = gait.rightLeg;
    parts.leftArm.rotation.x = gait.leftArm;
    parts.rightArm.rotation.x = gait.rightArm;
    parts.waist.rotation.set(...gait.waist);
    parts.sword.visible = false;
    const attacking = game.attackTime > 0 && !seated;
    const drawn =
      (attacking || game.rush !== null ||
        game.guarding ||
        game.comboWindow > 0 ||
        game.chargeTime > 0 ||
        spinning) &&
      !seated && game.rush !== 'shield' &&
      game.weapon === "sword";
    const blocking = (game.guarding || game.rush === "shield") && !seated;
    if (game.weapon === "none" && attacking) {
      const spec = game.heavyPunch ? HEAVY_PUNCH : UNARMED[game.combo];
      const pose = game.heavyPunch
        ? heavyPunchPose(spec.duration - game.attackTime)
        : unarmedPose(game.combo, spec.duration - game.attackTime);
      parts.leftArm.rotation.set(-.65, 0, -.18);
      parts.rightArm.rotation.set(-.65, 0, .18);
      parts.leftElbow.rotation.x = parts.rightElbow.rotation.x = -1.15;
      parts.waist.rotation.set(pose.waistPitch,pose.waistYaw,pose.waistRoll);
      parts.head.rotation.y=-pose.waistYaw*.65;
      motionPivot.current.position.y+=pose.bob;
      parts.leftLeg.rotation.x=game.combo===0 ? pose.frontLeg : pose.backLeg;
      parts.rightLeg.rotation.x=game.combo===0 ? pose.backLeg : pose.frontLeg;
      parts.leftKnee.rotation.x=parts.rightKnee.rotation.x=.18+.14*pose.load;
      if (game.heavyPunch || game.combo < 2) {
        const arm = game.heavyPunch || game.combo === 1 ? parts.rightArm : parts.leftArm;
        const elbow = game.heavyPunch || game.combo === 1 ? parts.rightElbow : parts.leftElbow;
        arm.rotation.x=pose.shoulder;
        arm.rotation.y=pose.shoulderYaw;
        elbow.rotation.x=pose.elbow;
      } else {
        parts.rightKnee.rotation.x=pose.knee;
        parts.leftArm.rotation.z=-.18-pose.strike*.22;
        parts.rightArm.rotation.z=.18+pose.strike*.22;
      }
    }
    if (game.weapon === "none" && game.chargeTime > 0 && !attacking) {
      const pose = unarmedPose(HEAVY_PUNCH_STAGE, game.chargeTime);
      parts.leftArm.rotation.set(-.72, -0.08, -.32);
      parts.leftElbow.rotation.x = -1.05;
      parts.rightArm.rotation.set(pose.shoulder, pose.shoulderYaw, .22);
      parts.rightElbow.rotation.x = pose.elbow;
      parts.rightWrist.rotation.set(0, 0, 0);
      parts.waist.rotation.set(pose.waistPitch, pose.waistYaw, pose.waistRoll);
      parts.head.rotation.y = -pose.waistYaw * .65;
      parts.leftLeg.rotation.x = pose.backLeg;
      parts.rightLeg.rotation.x = pose.frontLeg;
      parts.leftKnee.rotation.x = parts.rightKnee.rotation.x = pose.knee;
      motionPivot.current.position.y += pose.bob;
    }
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
    if (game.weapon === "sword" && (game.chargeTime > 0 || spinning)) {
      parts.rightArm.rotation.set(-0.8, 0, -0.9);
      parts.rightElbow.rotation.set(-0.3, 0, 0);
      parts.rightWrist.rotation.set(0, 0, 0);
      parts.waist.rotation.set(0.12, spinning ? 0 : -0.5, 0);
      parts.leftArm.rotation.set(-0.3, 0, 0.5);
      parts.leftKnee.rotation.x = parts.rightKnee.rotation.x = 0.2;
    }
    if (slash.current) {
      slash.current.visible =
        false; // Replaced by the ribbon sampled from the actual sword transform.
    }
    gear.sword.visible = game.swordUnlocked && game.phase !== "intro";
    mountEquipmentTier(gear.sword, gear.woodSword, gear.metalSword, game.swordUpgraded);
    mountEquipmentTier(gear.shield, gear.woodShield, gear.metalShield, game.shieldUpgraded);
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
    const shieldParent = blocking && game.rush !== 'shield' ? parts.leftWrist : parts.torso;
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
    } else if (!attacking && !drawn && !spinning) parts.leftArm.rotation.z = 0;
    if (game.rush) {
      const pose = rushPose(game.rush,game.rushTime,game.rushRebounding);
      parts.head.rotation.x = -.18;
      if (game.rush === 'thrust') {
        // Finish one full forward somersault before the collision window opens.
        motionPivot.current.rotation.x = pose.flip*Math.PI*2;
        motionPivot.current.position.y += pose.lift;
        const tucked = Math.sin(pose.flip*Math.PI);
        parts.waist.rotation.set(.18,0,0);
        parts.rightLeg.rotation.x = -.8*tucked+.35;
        parts.leftLeg.rotation.x = -.9*tucked-.25;
        parts.rightKnee.rotation.x = .4+1.4*tucked;
        parts.leftKnee.rotation.x = .6+1.2*tucked;
        parts.rightArm.rotation.set(-1.2,0,-.5);
        parts.rightElbow.rotation.set(-.5,0,0);
        parts.rightWrist.rotation.set(0,0,0);
        parts.leftArm.rotation.set(-1.1,0,.5);
        parts.leftElbow.rotation.set(-.7,0,0);
        parts.torso.updateWorldMatrix(true,true);
        handTarget.set(-.06,1.72,pose.active ? .48 : .28);
        parts.torso.localToWorld(handTarget);
        fitHand(parts.rightArm,parts.rightElbow,parts.rightWrist,handTarget);
        // Keep the blade on the character's forward axis, including the flip.
        parts.rightWrist.getWorldQuaternion(handOrientation).invert();
        motionPivot.current.getWorldQuaternion(gripRotation);
        bladeRotation.setFromAxisAngle(blade.set(1,0,0),Math.PI/2);
        gear.sword.quaternion.copy(handOrientation).multiply(gripRotation).multiply(bladeRotation);
        gear.sword.position.set(0,-.05,0);
        gear.sword.updateWorldMatrix(true,true);
        handTarget.set(0,-.15,0);
        gear.sword.localToWorld(handTarget);
        fitHand(parts.leftArm,parts.leftElbow,parts.leftWrist,handTarget);
      } else if (game.rush === 'punch') {
        const load = Math.min(1,pose.elapsed/.12);
        const drive = pose.active ? 1 : pose.elapsed < .12 ? 0 : Math.max(0,game.rushTime/.23);
        // Running shoulder drive: rear fist chambers at the ribs, then extends
        // with the hips while the opposite arm balances the forward lunge.
        parts.waist.rotation.set(.12+.32*drive,-.28*load+.6*drive,0);
        motionPivot.current.position.y += -.12*load+.22*Math.sin(drive*Math.PI/2);
        parts.rightArm.rotation.set(-.45-1.25*drive,.22*(1-drive),-.12);
        parts.rightElbow.rotation.set(-1.55+1.47*drive,0,0);
        parts.rightWrist.rotation.set(0,0,0);
        parts.leftArm.rotation.set(-.65+.85*drive,0,.28);
        parts.leftElbow.rotation.set(-1.2,0,0);
        parts.rightLeg.rotation.x = -.5*drive;
        parts.leftLeg.rotation.x = .85*drive;
        parts.rightKnee.rotation.x = .35;
        parts.leftKnee.rotation.x = .7;
      } else {
        const brace = shieldBracePose(game.rushTime,game.rushRebounding);
        parts.waist.rotation.set(brace.pitch,0,0);
        motionPivot.current.position.y += brace.lift-brace.crouch;
        parts.rightLeg.rotation.x = brace.rightLeg;
        parts.leftLeg.rotation.x = brace.leftLeg;
        parts.rightKnee.rotation.x = parts.leftKnee.rotation.x = brace.knee;
        parts.leftArm.rotation.set(-1.1,0,.45);
        parts.rightArm.rotation.set(-1.1,0,-.45);
        parts.leftElbow.rotation.set(-.8,0,0);
        parts.rightElbow.rotation.set(-.8,0,0);
        // Center the shield ahead of the chest; both hands share its rear grip.
        // The sword is sheathed so the right hand is genuinely free to brace.
        gear.shield.position.set(0,1.62,brace.shieldForward);
        parts.torso.getWorldQuaternion(handOrientation).invert();
        motionPivot.current.getWorldQuaternion(gripRotation);
        gear.shield.quaternion.copy(handOrientation).multiply(gripRotation);
        fitShieldHand(parts.leftArm,parts.leftElbow,parts.leftWrist,gear.shield,'left');
        fitShieldHand(parts.rightArm,parts.rightElbow,parts.rightWrist,gear.shield,'right');
      }
    }
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
    if (game.dodgeTime > 0) {
      const roll = rollPose(game.dodgeTime);
      root.current.rotation.y = Math.atan2(game.dodgeX, game.dodgeZ);
      motionPivot.current.position.y = roll.pivotHeight;
      motionPivot.current.rotation.x = roll.rootPitch;
      parts.waist.rotation.set(...roll.waist);
      parts.leftLeg.rotation.x = roll.leftLeg;
      parts.rightLeg.rotation.x = roll.rightLeg;
      parts.leftKnee.rotation.x = roll.leftKnee;
      parts.rightKnee.rotation.x = roll.rightKnee;
      parts.leftArm.rotation.x = roll.leftArm;
      parts.rightArm.rotation.x = roll.rightArm;
      parts.leftElbow.rotation.x = roll.leftElbow;
      parts.rightElbow.rotation.x = roll.rightElbow;
      parts.head.rotation.x = roll.headPitch;
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
    if (game.stunTime > 0 && !defeated) {
      const fade = Math.min(1, game.stunTime / .18);
      const sway = Math.sin(game.elapsed * 10) * fade;
      parts.waist.rotation.set(.23 * fade, 0, sway * .09);
      parts.head.rotation.set(.2 * fade, sway * .12, -sway * .13);
      parts.leftArm.rotation.set(-.4 * fade, 0, -.32 * fade);
      parts.rightArm.rotation.set(-.4 * fade, 0, .32 * fade);
      parts.leftElbow.rotation.x = parts.rightElbow.rotation.x = -.8 * fade;
      parts.leftKnee.rotation.x = parts.rightKnee.rotation.x = .3 * fade;
      motionPivot.current.position.y -= .13 * fade;
    }
    if (defeated) {
      root.current.rotation.z = -1.48 * dying.fall;
      root.current.position.y += 0.45 * dying.fall;
      parts.leftArm.rotation.x = parts.rightArm.rotation.x = -0.7;
      parts.leftKnee.rotation.x = parts.rightKnee.rotation.x = 0.8 * dying.fall;
    }
    if (drawn) {
      root.current.updateMatrixWorld(true);
      parts.rightWrist.parent!.getWorldQuaternion(gripRotation).invert();
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
      // Rotate the hand with its sword, rather than spinning the blade inside a
      // stationary fist. Both share the same grip axis and world-space sweep.
      parts.rightWrist.quaternion.copy(gripRotation).multiply(uprightRotation);
      gear.sword.quaternion.identity();
    }
    if (game.phase === 'obtaining') {
      root.current.visible = true;
      const lift = pickupEnvelope(game.pickupTime);
      parts.leftArm.rotation.x += (-2.6-parts.leftArm.rotation.x)*lift;
      parts.rightArm.rotation.x += (-2.6-parts.rightArm.rotation.x)*lift;
      parts.leftArm.rotation.z = -.2*lift;
      parts.rightArm.rotation.z = .2*lift;
      parts.leftElbow.rotation.x = parts.rightElbow.rotation.x = -.22*lift;
      parts.head.rotation.x = -.2*lift;
      gear.sword.visible = gear.shield.visible = gear.bow.visible = false;
    }
    if (!drawn && !attacking && !spinning && !game.rush && !game.moving && game.dodgeTime <= 0)
      parts.waist.rotation.z = Math.sin(clock.elapsedTime * 1.5) * 0.007;
  });
  return (
    <group ref={root} name="hero-model" scale={0.92}>
      <group ref={motionPivot} name="hero-motion-pivot" position={[0, 1.08, 0]}>
        <primitive object={model} position={[0, -1.08, 0]} />
      </group>
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
