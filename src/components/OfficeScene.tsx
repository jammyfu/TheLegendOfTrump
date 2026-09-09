import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Mesh } from "three";
export function OfficeScene() {
  const gltf = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/oval-arena.glb",
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
  return (
    <>
      <primitive object={model} />
      <pointLight
        position={[0, 6, -3]}
        intensity={65}
        distance={22}
        color="#ffe5b2"
      />
      <pointLight
        position={[0, 5, 5]}
        intensity={32}
        distance={18}
        color="#d4e6ff"
      />
    </>
  );
}
