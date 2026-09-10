import { Group, Mesh, Vector3 } from 'three';

/** Split desk triangles out of the merged room so resizing cannot move floors. */
export function fitOfficeFurniture(model: Group) {
  model.updateMatrixWorld(true);
  let root: import('three').Object3D | undefined;
  model.traverse(n => { if (n.name.startsWith('OfficeFurnishing')) root = n; });
  if (!root) return;
  const meshes: Mesh[] = [];
  root.traverse(n => { if (n instanceof Mesh) meshes.push(n); });
  const p = new Vector3();
  for (const mesh of meshes) {
    const geometry = mesh.geometry.clone();
    const positions = geometry.getAttribute('position');
    const index = geometry.index;
    const rest: number[] = [], desk: number[] = [], chair: number[] = [];
    const count = index?.count ?? positions.count;
    for (let i=0;i<count;i+=3) {
      const ids = [0,1,2].map(k => index ? index.getX(i+k) : i+k);
      const points = ids.map(id => p.fromBufferAttribute(positions,id).applyMatrix4(mesh.matrixWorld).clone());
      const isChair = points.every(v => Math.abs(v.x)<1.65 && v.y>-.01 && v.y<5.5 && v.z>-23.7 && v.z<-22.6);
      const isDesk = !isChair && points.every(v => Math.abs(v.x)<6.4 && v.y>-.01 && v.y<7 && v.z>-22.95 && v.z<-17.7);
      (isDesk ? desk : isChair ? chair : rest).push(...ids);
    }
    geometry.setIndex(rest);
    mesh.geometry = geometry;
    for (const [ids, kind] of [[desk,'desk'],[chair,'chair']] as const) {
      if (!ids.length) continue;
      const part = geometry.clone();
      part.setIndex(ids);
      const pos = part.getAttribute('position');
      const inverse = mesh.matrixWorld.clone().invert();
      for (const id of new Set(ids)) {
        p.fromBufferAttribute(pos,id).applyMatrix4(mesh.matrixWorld);
        if (kind === 'desk') { p.x *= 0.8; p.y *= 0.8; p.z = -20.5 + (p.z+20.5)*0.8; }
        else p.y += 0.8;
        p.applyMatrix4(inverse);
        pos.setXYZ(id,p.x,p.y,p.z);
      }
      pos.needsUpdate = true;
      part.computeVertexNormals(); part.computeBoundingBox(); part.computeBoundingSphere();
      const object = new Mesh(part,mesh.material);
      object.name = `office-${kind}`;
      object.position.copy(mesh.position); object.quaternion.copy(mesh.quaternion); object.scale.copy(mesh.scale);
      object.castShadow = object.receiveShadow = true;
      object.userData.cameraFade = true;
      mesh.parent!.add(object);
    }
  }
}
