import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Group, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { game } from "../game/simulation";
const MODEL_URL = import.meta.env.BASE_URL + "models/trump-n64.glb";
export function Character() {
  const root = useRef<Group>(null);
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
        : game.moving
          ? Math.abs(Math.sin(game.elapsed * 12)) * 0.045
          : 0,
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
    parts.sword.visible = game.attackTime > 0;
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
