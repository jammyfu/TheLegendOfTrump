import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Group, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { game } from "../game/simulation";
const MODEL_URL = import.meta.env.BASE_URL + "models/trump-n64.glb";
export function Character() {
  const root = useRef<Group>(null);
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
      sword: model.getObjectByName("SwordPivot")!,
      torso: model.getObjectByName("TorsoPivot")!,
    }),
    [model],
  );
  useFrame(({ clock }) => {
    if (!root.current) return;
    const seated =
      game.zone === "office" &&
      (game.phase === "dialogue" || game.phase === "won");
    const walk = game.moving ? Math.sin(game.elapsed * 12) * 0.48 : 0;
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
    parts.leftLeg.rotation.x = walk;
    parts.rightLeg.rotation.x = -walk;
    parts.leftArm.rotation.x = -walk;
    parts.rightArm.rotation.x = game.attackTime > 0 ? -1.05 : walk;
    parts.rightArm.rotation.z =
      game.attackTime > 0
        ? -Math.sin((game.attackTime / 0.32) * Math.PI) * 1.2
        : 0;
    parts.sword.visible = false;
    const attacking = game.attackTime > 0 && !seated;
    const blocking = game.guarding && !seated;
    gear.sword.name = "EquippedSword";
    gear.shield.name = "EquippedShield";
    const swordParent = attacking ? parts.rightArm : parts.torso;
    if (gear.sword.parent !== swordParent) swordParent.add(gear.sword);
    gear.sword.position.set(
      ...((attacking ? [-0.36, -0.93, 0.1] : [0.35, 2.05, -0.43]) as [
        number,
        number,
        number,
      ]),
    );
    gear.sword.rotation.set(
      ...((attacking ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI - 0.5]) as [
        number,
        number,
        number,
      ]),
    );
    const shieldParent = blocking ? parts.leftArm : parts.torso;
    if (gear.shield.parent !== shieldParent) shieldParent.add(gear.shield);
    gear.shield.position.set(
      ...((blocking ? [0.28, -0.65, 0.25] : [0, 1.5, -0.55]) as [
        number,
        number,
        number,
      ]),
    );
    gear.shield.rotation.set(
      ...((blocking ? [0.95, 0, -0.15] : [0, Math.PI, 0.18]) as [
        number,
        number,
        number,
      ]),
    );
    if (blocking) {
      parts.leftArm.rotation.x = -0.95;
      parts.leftArm.rotation.z = 0.1;
    } else parts.leftArm.rotation.z = 0;
    if (!game.grounded) {
      parts.leftLeg.rotation.x = -0.45;
      parts.rightLeg.rotation.x = 0.3;
    }
    parts.torso.rotation.x =
      game.dodgeTime > 0 ? 0.65 : game.sprinting ? 0.16 : 0;
    if (seated) {
      parts.leftLeg.rotation.x = -1.2;
      parts.rightLeg.rotation.x = -1.2;
      parts.leftArm.rotation.x = -1.4;
      parts.rightArm.rotation.x =
        -1.4 + Math.sin(clock.elapsedTime * 7) * 0.035;
      parts.rightArm.rotation.z = -0.1;
    }
    parts.torso.rotation.z = game.moving
      ? Math.sin(game.elapsed * 6) * 0.025
      : Math.sin(clock.elapsedTime * 1.5) * 0.007;
  });
  return (
    <group ref={root} scale={0.92}>
      <primitive object={model} />
    </group>
  );
}
useLoader.preload(GLTFLoader, MODEL_URL);
