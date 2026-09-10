import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Box3,
  DoubleSide,
  Mesh,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import { game } from "../game/simulation";
import { applyLegendMaterials } from "../game/materials";
import { OFFICE_SCALE } from "../game/world";
import { fitOfficeFurniture } from "../game/officeFurniture";
import { OcclusionFade, meshObscuresActor } from "../game/occlusion";
import {
  cutawayFade,
  cutawaySide,
  obscuresSubject,
  type CutawaySide,
} from "../game/cutaway";
export function OfficeScene() {
  const gltf = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/oval-cutaway.glb",
  );
  const portraits = useLoader(
    TextureLoader,
    [
      "creator-presidential-portrait.webp",
      "residence-portrait-stateswoman.webp",
      "residence-portrait-signing.webp",
      "residence-portrait-reception.webp",
    ].map(
      (file) => import.meta.env.BASE_URL + "textures/portraits/" + file,
    ),
  );
  for (const portrait of portraits) portrait.colorSpace = SRGBColorSpace;
  const model = useMemo(() => {
    const m = gltf.scene.clone(true);
    m.scale.setScalar(OFFICE_SCALE);
    fitOfficeFurniture(m);
    applyLegendMaterials(m);
    m.traverse((n) => {
      if (n instanceof Mesh) {
        // The room receives ordinary actor shadows, but its walls/furniture
        // never cast the large moving shadows produced by camera cutaways.
        n.castShadow = false;
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
      const side = cutawaySide(node.name);
      if (!side) return;
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
        side,
        meshes,
        opacity: 1,
        hold: 0,
      });
    });
    return list;
  }, [model]);
  const subject = useMemo(() => new Vector3(), []);
  const deskFades = useRef<OcclusionFade[]>([]);
  useEffect(() => {
    const list: OcclusionFade[] = [];
    model.traverse(n => { if (n instanceof Mesh && ['office-desk','office-chair'].includes(n.name)) list.push(new OcclusionFade(n)); });
    deskFades.current=list;
    return ()=>{list.forEach(f=>f.dispose());deskFades.current=[];};
  }, [model]);
  const deskBounds = useMemo(() => new Box3(), []);
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
    const blockedFurniture=new Set<string>();
    for (const fade of deskFades.current) {
      if(blockedFurniture.has(fade.mesh.name))continue;
      const bounds=deskBounds.setFromObject(fade.mesh);
      const blocked = game.phase === 'playing' && (meshObscuresActor(fade.mesh,bounds,camera.position,game)
        || (!!locked && meshObscuresActor(fade.mesh,bounds,camera.position,{x:locked.x,y:0,z:locked.z},locked.id===100?5.7:2.85)));
      if(blocked)blockedFurniture.add(fade.mesh.name);
    }
    // Multi-material GLBs split the desk into separate meshes. Fade the entire
    // piece together so drawer fronts cannot remain opaque over a faded body.
    for(const fade of deskFades.current)fade.update(blockedFurniture.has(fade.mesh.name),Math.min(delta,.1));
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
        mesh.castShadow = false;
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
      <primitive object={model} name="office-environment" />
      {([-1, 1] as const).flatMap((side, sideIndex) =>
        ([-1, 1] as const).map((depth, depthIndex) => (
          <mesh
            key={`${side}:${depth}`}
            // The source paintings sit in wall recesses. Keep the texture on
            // the room-facing side of the painted field so it cannot appear
            // through the exterior windows.
            position={[side * 34.92, 11.4, depth * 12.3]}
            rotation={[0, side * Math.PI * 0.5, 0]}
          >
            <planeGeometry args={[5.12, 3.42]} />
            <meshStandardMaterial
              map={portraits[sideIndex * 2 + depthIndex]}
              roughness={0.4}
              metalness={0.08}
              side={DoubleSide}
            />
          </mesh>
        )),
      )}
      <pointLight
        position={[0, 14, -10]}
        intensity={180}
        distance={70}
        color="#ffe5b2"
      />
      <pointLight
        position={[0, 12, 14]}
        intensity={120}
        distance={60}
        color="#d4e6ff"
      />
    </>
  );
}
