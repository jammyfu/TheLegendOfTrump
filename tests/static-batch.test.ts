import test from "node:test";
import assert from "node:assert/strict";
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Vector3 } from "three";
import { batchStatic } from "../src/game/staticBatch";
test("static batching preserves world positions, independent lids and cleanup", () => {
  const root = new Group();
  root.position.set(8, 2, 4);
  const lid = new Group();
  lid.name = "LidPivot";
  root.add(lid);
  for (const parent of [root, lid])
    for (let i = 0; i < 3; i++) {
      const m = new Mesh(
        new BoxGeometry(),
        new MeshStandardMaterial({ color: "red" }),
      );
      m.position.x = i;
      parent.add(m);
    }
  const cleanup = batchStatic(root, ["LidPivot"]);
  const body = root.children.find((o) => o.name === "static-batch")!;
  const moving = lid.children.find((o) => o.name === "static-batch")!;
  assert.equal(body.children.length, 1);
  assert.equal(moving.children.length, 1);
  const mesh = body.children[0] as Mesh;
  mesh.geometry.computeBoundingBox();
  assert.equal(mesh.geometry.boundingBox!.min.x, -0.5);
  assert.equal(mesh.geometry.boundingBox!.max.x, 2.5);
  lid.rotation.x = 1;
  root.updateMatrixWorld(true);
  assert.notDeepEqual(moving.matrixWorld.elements, body.matrixWorld.elements);
  assert.deepEqual(root.getWorldPosition(new Vector3()).toArray(), [8, 2, 4]);
  cleanup();
  assert.equal(
    root.children.filter((o) => o instanceof Mesh && o.visible).length,
    3,
  );
  assert.equal(root.getObjectByName("static-batch"), undefined);
});
