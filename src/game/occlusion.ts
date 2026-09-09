import { Box3, Ray, Raycaster, Vector3, Mesh, type Material } from "three";

const ray = new Ray(),
  direction = new Vector3(),
  hit = new Vector3();
const candidateBounds = new Box3();
const meshRay = new Raycaster();
export function meshBlocksView(mesh: Mesh, bounds: Box3, camera: Vector3, subject: Vector3) {
  if (!blocksView(bounds, camera, subject)) return false;
  const distance = direction.subVectors(camera, subject).length();
  meshRay.set(subject, direction.normalize());
  meshRay.near = 0.25;
  meshRay.far = distance - 0.1;
  return meshRay.intersectObject(mesh, false).length > 0;
}
/** Low landscaping, seats and ground surfaces never participate in camera fading. */
export function canFadeForCamera(mesh: Mesh) {
  if (typeof mesh.userData.cameraFade === "boolean") return mesh.userData.cameraFade;
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  if (!mesh.geometry.boundingBox) return false;
  candidateBounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
  return candidateBounds.max.y - candidateBounds.min.y >= 2.4;
}
/** Segment test also works when the camera is inside a tree canopy. */
export function blocksView(bounds: Box3, camera: Vector3, subject: Vector3) {
  if (bounds.max.y - bounds.min.y < 0.4) return false; // Floors and markings.
  direction.subVectors(camera, subject);
  const distance = direction.length();
  if (distance < 0.1) return false;
  ray.set(subject, direction.multiplyScalar(1 / distance));
  return (
    bounds.containsPoint(camera) ||
    (ray.intersectBox(bounds, hit) !== null &&
      hit.distanceTo(subject) < distance - 0.1)
  );
}

/** Only this mesh receives temporary materials, even when a GLB shares them. */
export class OcclusionFade {
  readonly original: Material | Material[];
  readonly copies: Material[];
  readonly base: number[];
  value = 1;
  hold = 0;
  constructor(readonly mesh: Mesh) {
    this.original = mesh.material;
    const materials = Array.isArray(this.original)
      ? this.original
      : [this.original];
    this.base = materials.map((m) => m.opacity);
    this.copies = materials.map((m) => {
      const copy = m.clone();
      copy.onBeforeCompile = m.onBeforeCompile;
      copy.customProgramCacheKey = m.customProgramCacheKey;
      copy.transparent = true;
      copy.depthWrite = false;
      return copy;
    });
    mesh.material = Array.isArray(this.original) ? this.copies : this.copies[0];
  }
  update(blocked: boolean, dt: number) {
    this.hold = blocked ? 0.18 : Math.max(0, this.hold - dt);
    const target = this.hold > 0 ? 0.15 : 1;
    this.value +=
      (target - this.value) * (1 - Math.exp(-dt * (target < 1 ? 18 : 7)));
    this.copies.forEach((m, i) => (m.opacity = this.base[i] * this.value));
    return target === 1 && this.value > 0.995;
  }
  dispose() {
    if (
      this.mesh.material === this.copies[0] ||
      this.mesh.material === this.copies
    )
      this.mesh.material = this.original;
    this.copies.forEach((m) => m.dispose());
  }
}
