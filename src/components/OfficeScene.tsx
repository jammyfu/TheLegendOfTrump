import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Box3, Mesh, Vector3 } from "three";
import { game } from "../game/simulation";
import {
  cutawayFade,
  obscuresSubject,
  type CutawaySide,
} from "../game/cutaway";
export function OfficeScene() {
  const gltf = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/oval-cutaway.glb",
  );
  const model = useMemo(() => {
    const m = gltf.scene.clone(true);
    m.traverse((n) => {
      if (n instanceof Mesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    return m;
  }, [gltf]);
  const walls = useMemo(() => {
    const list: {
      bounds: Box3;
      side: CutawaySide;
      meshes: Mesh[];
      opacity: number;
      hold: number;
    }[] = [];
    model.updateMatrixWorld(true);
    model.traverse((node) => {
      if (!node.name.startsWith("OfficeCutaway_")) return;
      // glTF multi-material groups contain child meshes. Only process the root.
      if (node.parent?.name.startsWith("OfficeCutaway_")) return;
      const meshes: Mesh[] = [];
      node.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const singleMaterial = !Array.isArray(child.material);
        const materials = (
          Array.isArray(child.material) ? child.material : [child.material]
        ).map((source) => {
          const material = source.clone();
          material.transparent = true;
          return material;
        });
        child.material = singleMaterial ? materials[0] : materials;
        meshes.push(child);
      });
      list.push({
        bounds: new Box3().setFromObject(node),
        side: node.name.slice("OfficeCutaway_".length) as CutawaySide,
        meshes,
        opacity: 1,
        hold: 0,
      });
    });
    return list;
  }, [model]);
  const subject = useMemo(() => new Vector3(), []);
  useEffect(
    () => () => {
      for (const wall of walls)
        for (const mesh of wall.meshes)
          for (const material of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material])
            material.dispose();
    },
    [walls],
  );
  useFrame(({ camera }, delta) => {
    subject.set(game.x, game.y + 1.65, game.z);
    const locked = game.lockTarget;
    for (const wall of walls) {
      const obstructed =
        obscuresSubject(
          wall.bounds,
          camera.position,
          subject,
          0.55,
          wall.side,
        ) ||
        (!!locked &&
          obscuresSubject(
            wall.bounds,
            camera.position,
            {
              x: locked.x,
              y: 1.8,
              z: locked.z,
            },
            0.55,
            wall.side,
          ));
      const fade = cutawayFade(
        wall.opacity,
        wall.hold,
        obstructed,
        Math.min(delta, 0.1),
      );
      wall.opacity = fade.opacity;
      wall.hold = fade.hold;
      for (const mesh of wall.meshes) {
        mesh.visible = wall.opacity > 0.015;
        mesh.castShadow = wall.opacity > 0.95;
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]) {
          material.opacity = wall.opacity;
          material.depthWrite = wall.opacity > 0.98;
        }
      }
    }
  });
  return (
    <>
      <primitive object={model} />
      <pointLight
        position={[0, 7, -5]}
        intensity={110}
        distance={35}
        color="#ffe5b2"
      />
      <pointLight
        position={[0, 6, 7]}
        intensity={65}
        distance={30}
        color="#d4e6ff"
      />
    </>
  );
}
