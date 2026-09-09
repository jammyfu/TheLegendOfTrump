import { batchStatic } from "../game/staticBatch";
import { StaticBatch } from "./StaticBatch";
import { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Group, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { game } from "../game/simulation";
import { interactions, cratePositions } from "../game/world";
import { Box, Cylinder } from "./Primitives";
export function Asset({
  file,
  id,
  position,
}: {
  file: string;
  id: string;
  position: [number, number, number];
}) {
  const gltf = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/" + file,
  );
  const root = useRef<Group>(null);
  const model = useMemo(() => {
    const object = gltf.scene.clone(true);
    object.traverse((n) => {
      if (n instanceof Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    return object;
  }, [gltf]);
  useLayoutEffect(
    () => batchStatic(model, ["LidPivot", "HandlePivot"]),
    [model],
  );
  const lid = useMemo(() => model.getObjectByName("LidPivot"), [model]);
  const lever = useMemo(() => model.getObjectByName("HandlePivot"), [model]);
  useFrame((_, dt) => {
    if (!root.current) return;
    root.current.visible = id.startsWith("herb")
      ? !game.harvested.has(id)
      : id.startsWith("crate-")
        ? !game.crates[Number(id.split("-")[1])].broken
        : true;
    if (lid)
      lid.rotation.x +=
        ((game.opened.has(id) ? -1.6 : 0) - lid.rotation.x) *
        Math.min(1, dt * 8);
    if (lever)
      lever.rotation.x +=
        ((game.gateOpen ? -0.7 : 0.6) - lever.rotation.x) * Math.min(1, dt * 8);
  });
  return (
    <group ref={root} position={position}>
      <primitive object={model} />
    </group>
  );
}
export function InteractiveProps() {
  const bowSource = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/adventure-bow.glb",
  );
  const treasure = useMemo(() => bowSource.scene.clone(true), [bowSource]);
  const reward = useRef<Group>(null);
  const gate = useRef<Group>(null);
  const marker = useRef<Group>(null);
  useFrame((_, dt) => {
    if (reward.current) {
      reward.current.visible = game.opened.has("chest-east");
      reward.current.position.y = 1.25 + Math.sin(game.elapsed * 2) * 0.08;
      reward.current.rotation.y = game.elapsed * 0.4;
    }
    if (gate.current)
      gate.current.position.y +=
        ((game.gateOpen ? -2.8 : 0) - gate.current.position.y) *
        Math.min(1, dt * 5);
    const current = game.interaction;
    if (marker.current) {
      marker.current.visible = !!current && game.phase === "playing";
      if (current) marker.current.position.set(current.x, 0.42, current.z);
    }
  });
  return (
    <>
      <group ref={reward} position={[17, 1.25, 6]} scale={0.65} visible={false}>
        <primitive object={treasure} />
      </group>
      {interactions
        .filter((i) => ["chest", "lever", "herb"].includes(i.kind))
        .map((i) => (
          <Asset
            key={i.id}
            id={i.id}
            file={"adventure-" + i.kind + ".glb"}
            position={[i.x, i.id === "chest-garden" ? 0.37 : 0, i.z]}
          />
        ))}
      {cratePositions.map(([x, z], i) => (
        <Asset
          key={i}
          id={"crate-" + i}
          file="adventure-crate.glb"
          position={[x, 0, z]}
        />
      ))}
      <group position={[-3, 0, 18]}>
        <Cylinder
          position={[0, 0.8, 0]}
          radius={0.09}
          rise={1.6}
          color="#66452e"
        />
        <Box position={[0, 1.7, 0]} scale={[1.8, 1, 0.23]} color="#936735" />
        {[1.45, 1.7, 1.92].map((y) => (
          <Box
            key={y}
            position={[0, y, 0.13]}
            scale={[1.2, 0.04, 0.015]}
            color="#e6d4a3"
          />
        ))}
      </group>
      <group position={[-13, 0, 0.6]}>
        <group ref={gate}>
          <Box
            position={[0, 1.4, 0]}
            scale={[6.5, 0.15, 0.3]}
            color="#b8a56d"
          />
          <Box
            position={[0, 0.4, 0]}
            scale={[6.5, 0.12, 0.25]}
            color="#526261"
          />
          {Array.from({ length: 12 }, (_, i) => (
            <Cylinder
              key={i}
              position={[-3 + i * 0.545, 1.2, 0]}
              radius={0.065}
              rise={2.4}
              color="#46585a"
            />
          ))}
        </group>
        {[-3.4, 3.4].map((x) => (
          <Box
            key={x}
            position={[x, 1.3, 0]}
            scale={[0.35, 2.6, 0.4]}
            color="#c8c4ad"
          />
        ))}
      </group>
      <group ref={marker}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 0.87, 32]} />
          <meshBasicMaterial
            color="#efd88d"
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
      </group>
      <StaticBatch>
        {[-1, 1].map((s) => (
          <group key={s}>
            {Array.from({ length: 22 }, (_, i) => (
              <group key={i} position={[s * 25.8, 0, 22 - i * 2]}>
                <Cylinder
                  position={[0, 0.85, 0]}
                  radius={0.05}
                  rise={1.7}
                  color="#384c43"
                />
                <Box
                  position={[0, 1.4, 0]}
                  scale={[0.08, 0.08, 2]}
                  color="#384c43"
                />
                <Box
                  position={[0, 0.6, 0]}
                  scale={[0.08, 0.08, 2]}
                  color="#384c43"
                />
              </group>
            ))}
          </group>
        ))}
      </StaticBatch>
    </>
  );
}
