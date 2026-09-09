import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Mesh } from "three";
import { Flag } from "./Primitives";
export function Estate() {
  const source = useLoader(
    GLTFLoader,
    import.meta.env.BASE_URL + "models/white-house-estate.glb",
  );
  const model = useMemo(() => {
    const m = source.scene.clone(true);
    m.traverse((n) => {
      if (n instanceof Mesh) {
        n.receiveShadow = true;
        n.castShadow = !!n.parent?.name.match(/Mansion|Wing/);
      }
    });
    return m;
  }, [source]);
  return (
    <>
      <primitive object={model} />
      <Flag position={[0, 29.9, -35.27]} scale={1.1} />
    </>
  );
}
