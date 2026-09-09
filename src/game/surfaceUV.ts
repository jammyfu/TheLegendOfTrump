import { BufferGeometry, Float32BufferAttribute, Mesh, Vector3 } from "three";
import { surfaceMeters, type Surface } from "./surfaceCatalog";
const cache = new WeakMap<BufferGeometry, Map<string, BufferGeometry>>();
/** Bake repeat coordinates in the bind/static pose, including GLB node scale. */
export function ensureSurfaceUVs(mesh: Mesh, surface: Surface) {
  if (mesh.geometry.userData.surfaceUV) return;
  const source = mesh.geometry;
  mesh.updateWorldMatrix(true, false);
  const meters = surfaceMeters(surface);
  const key = meters + ":" + mesh.matrixWorld.elements.map(v => v.toFixed(4)).join(",");
  const variants = cache.get(source) ?? new Map<string, BufferGeometry>();
  let geometry = variants.get(key);
  if (!geometry) {
    geometry = source.index ? source.toNonIndexed() : source.clone();
    const position = geometry.getAttribute("position");
    const uv = new Float32Array(position.count * 2);
    const a = new Vector3(), b = new Vector3(), c = new Vector3();
    const edge = new Vector3(), normal = new Vector3();
    for (let i = 0; i < position.count; i += 3) {
      a.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(position,i+1).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(position,i+2).applyMatrix4(mesh.matrixWorld);
      normal.subVectors(b,a).cross(edge.subVectors(c,a));
      const nx=Math.abs(normal.x), ny=Math.abs(normal.y), nz=Math.abs(normal.z);
      const axis=nx>=ny && nx>=nz ? 0 : ny>=nz ? 1 : 2;
      [a,b,c].forEach((p,j) => {
        uv[(i+j)*2]=(axis===0 ? p.z : p.x)/meters;
        uv[(i+j)*2+1]=(axis===1 ? p.z : p.y)/meters;
      });
    }
    geometry.setAttribute("uv",new Float32BufferAttribute(uv,2));
    geometry.userData.surfaceUV = { surface, meters };
    variants.set(key,geometry);
    cache.set(source,variants);
  }
  mesh.geometry=geometry;
}
