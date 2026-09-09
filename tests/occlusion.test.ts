import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { blocksView, meshBlocksView, canFadeForCamera, OcclusionFade } from "../src/game/occlusion";
import { batchStatic } from "../src/game/staticBatch";
test("empty space between merged objects is not an obstruction", () => {
  const root = new Group(), material = new MeshStandardMaterial();
  for (const x of [1, 5]) {
    const mesh = new Mesh(new BoxGeometry(1, 4, 1), material);
    mesh.position.set(x, 2, 4);
    root.add(mesh);
  }
  const cleanup = batchStatic(root);
  root.updateMatrixWorld(true);
  const mesh = root.getObjectByName("static-batch")!.children[0] as Mesh;
  const bounds = new Box3().setFromObject(mesh);
  assert.equal(blocksView(bounds, new Vector3(3, 2, 8), new Vector3(3, 2, 0)), true);
  assert.equal(meshBlocksView(mesh, bounds, new Vector3(3, 2, 8), new Vector3(3, 2, 0)), false);
  assert.equal(meshBlocksView(mesh, bounds, new Vector3(1, 2, 8), new Vector3(1, 2, 0)), true);
  cleanup();
});
test("grass, flower beds and benches cannot inherit fading from nearby tall objects", () => {
  const root = new Group();
  const material = new MeshStandardMaterial();
  for (const height of [0.05, 0.6, 1.5, 4, 4]) {
    const mesh = new Mesh(new BoxGeometry(1, height, 1), material);
    mesh.position.set(1, height / 2, 1);
    root.add(mesh);
  }
  root.updateMatrixWorld(true);
  assert.deepEqual(root.children.map(m => canFadeForCamera(m as Mesh)), [false, false, false, true, true]);
  const cleanup = batchStatic(root);
  const batches = root.getObjectByName("static-batch")!.children as Mesh[];
  assert.equal(batches.length, 2);
  assert.deepEqual(batches.map(m => m.userData.cameraFade).sort(), [false, true]);
  const scenery = batches.find(m => !m.userData.cameraFade)!;
  const tall = batches.find(m => m.userData.cameraFade)!;
  const fade = new OcclusionFade(tall);
  fade.update(true, 0.1);
  assert.equal((scenery.material as MeshStandardMaterial).opacity, 1);
  fade.dispose();
  cleanup();
});
test("occlusion segment includes camera-inside-canopy, excludes objects behind camera and floors", () => {
  const box = new Box3(new Vector3(-2, 0, 3), new Vector3(2, 5, 6));
  const hero = new Vector3(0, 1.5, 0);
  assert.ok(blocksView(box, new Vector3(0, 2, 9), hero));
  assert.ok(blocksView(box, new Vector3(0, 2, 4), hero));
  assert.equal(blocksView(box, new Vector3(0, 2, 2), hero), false);
  assert.equal(blocksView(box, new Vector3(8, 2, 9), hero), false);
  assert.equal(
    blocksView(
      new Box3(new Vector3(-20, 0, -20), new Vector3(20, 0.1, 20)),
      new Vector3(0, 2, 9),
      hero,
    ),
    false,
  );
});
test("fade isolates shared materials, holds briefly, then restores exact original state", () => {
  const material = new MeshStandardMaterial({ opacity: 0.8 });
  const mesh = new Mesh(new BoxGeometry(), material),
    sibling = new Mesh(mesh.geometry, material);
  const fade = new OcclusionFade(mesh);
  for (let i = 0; i < 60; i++) fade.update(true, 1 / 60);
  assert.ok(fade.copies[0].opacity < 0.13);
  assert.equal(sibling.material.opacity, 0.8);
  assert.equal(fade.copies[0].depthWrite, false);
  assert.equal(fade.update(false, 0.05), false);
  let done = false;
  for (let i = 0; i < 120; i++) done = fade.update(false, 1 / 60);
  assert.ok(done);
  fade.dispose();
  assert.equal(mesh.material, material);
  assert.equal(mesh.material.transparent, false);
  assert.equal(mesh.material.depthWrite, true);
});
