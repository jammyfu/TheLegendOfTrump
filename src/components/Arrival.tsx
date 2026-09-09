import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Group, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { game } from "../game/simulation";
import { introPose } from "../game/intro";
export function Arrival() {
  const root = useRef<Group>(null);
  const source = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/arrival-helicopter.glb",
  );
  const model = useMemo(() => {
    const m = source.scene.clone(true);
    m.traverse((n) => {
      if (n instanceof Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    return m;
  }, [source]);
  const rotor = useMemo(() => model.getObjectByName("ArrivalRotor"), [model]);
  const rear = useMemo(
    () => model.getObjectByName("ArrivalTailRotor"),
    [model],
  );
  const door = useMemo(() => model.getObjectByName("ArrivalDoor"), [model]);
  const stairs = useMemo(() => model.getObjectByName("ArrivalStairs"), [model]);
  useFrame((_, dt) => {
    if (!root.current) return;
    root.current.visible = game.phase === "intro";
    if (game.phase !== "intro") return;
    const p = introPose(game.introTime);
    root.current.position.set(...p.helicopter);
    root.current.rotation.set(p.pitch, p.heading, p.bank);
    if (rotor) rotor.rotation.y += dt * 38;
    if (rear) rear.rotation.x += dt * 48;
    if (door) door.position.z = 0.7 - p.door * 1.5;
    if (stairs) {
      stairs.visible = p.stairs > 0.001;
      stairs.scale.x = Math.max(0.01, p.stairs);
      stairs.position.x = 1.3 + p.stairs * 0.6;
    }
  });
  return (
    <group ref={root} name="arrival-helicopter" visible={false}>
      <primitive object={model} />
    </group>
  );
}
