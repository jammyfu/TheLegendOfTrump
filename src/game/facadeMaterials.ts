import { Mesh, type Object3D, type Material } from "three";
/** Window planes sit only 8–12 cm in front of distant walls. Keep opaque depth
 * testing, but bias the glass outward rather than letting it fight the facade. */
export function stabilizeFacadeMaterials(root: Object3D) {
  const clones = new Map<Material, Material>();
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const fix = (material: Material) => {
      if (!/glass/i.test(material.name)) return material;
      if (!clones.has(material)) {
        const clone = material.clone();
        clone.polygonOffset = true;
        clone.polygonOffsetFactor = -1;
        clone.polygonOffsetUnits = -2;
        clone.depthTest = clone.depthWrite = true;
        clones.set(material, clone);
      }
      return clones.get(material)!;
    };
    o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
  });
  return [...clones.values()];
}
