import {
  Group,
  Mesh,
  Matrix4,
  type Object3D,
  type Material,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Bake only explicitly static subtrees. Animated pivots remain separate batches. */
export function batchStatic(root: Object3D, pivots: string[] = []) {
  const allocated: BufferGeometry[] = [];
  const originals: Mesh[] = [];
  const batches: Group[] = [];
  root.updateWorldMatrix(true, true);
  const bake = (node: Object3D) => {
    const inverse = new Matrix4().copy(node.matrixWorld).invert();
    const groups = new Map<string, { meshes: Mesh[]; material: Material }>();
    const visit = (o: Object3D) => {
      if (o !== node && pivots.includes(o.name)) {
        bake(o);
        return;
      }
      if (
        o instanceof Mesh &&
        !Array.isArray(o.material) &&
        o.visible &&
        !o.material.transparent
      ) {
        const json = o.material.toJSON();
        delete (json as Partial<typeof json>).uuid;
        delete (json as Partial<typeof json>).metadata;
        const key =
          JSON.stringify(json) +
          o.castShadow +
          o.receiveShadow +
          Object.keys(o.geometry.attributes).sort().join(",");
        const bucket = groups.get(key) ?? {
          meshes: [] as Mesh[],
          material: o.material,
        };
        bucket.meshes.push(o);
        groups.set(key, bucket);
      }
      o.children.slice().forEach(visit);
    };
    visit(node);
    const batch = new Group();
    batch.name = "static-batch";
    for (const { meshes, material } of groups.values()) {
      if (meshes.length < 2) continue;
      const parts = meshes.map((m) => {
        const g = m.geometry.index
          ? m.geometry.toNonIndexed()
          : m.geometry.clone();
        return g.applyMatrix4(
          new Matrix4().multiplyMatrices(inverse, m.matrixWorld),
        );
      });
      const geometry = mergeGeometries(parts, false);
      parts.forEach((g) => g.dispose());
      if (!geometry) continue;
      allocated.push(geometry);
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = meshes[0].castShadow;
      mesh.receiveShadow = meshes[0].receiveShadow;
      batch.add(mesh);
      meshes.forEach((m) => {
        m.visible = false;
        originals.push(m);
      });
    }
    node.add(batch);
    batches.push(batch);
  };
  bake(root);
  return () => {
    originals.forEach((m) => (m.visible = true));
    batches.forEach((b) => b.removeFromParent());
    allocated.forEach((g) => g.dispose());
  };
}
