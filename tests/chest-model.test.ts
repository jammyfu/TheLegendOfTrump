import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Box3, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

async function chest(open = true) {
  const bytes = await readFile(new URL('../public/models/adventure-chest.glb', import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '',
  );
  const lid = scene.getObjectByName('LidPivot');
  assert.ok(lid, 'the runtime lid animation must retain its named pivot');
  assert.ok(lid.position.distanceTo(new Vector3(0, .72, -.45)) < 1e-5);
  if (open) lid.rotation.x = -1.6;
  scene.updateMatrixWorld(true);
  return scene;
}

test('open chest has a clear cavity, including beneath both metal bands', async () => {
  const scene = await chest();
  for (const x of [-.60, -.56, -.50, 0, .50, .56, .60]) {
    for (const z of [-.3, 0, .3]) {
      const hits = new Raycaster(new Vector3(x, 2, z), new Vector3(0,-1,0)).intersectObject(scene);
      assert.ok(hits.length, 'the cavity must have a solid floor');
      assert.ok(Math.abs(hits[0].point.y - .1) < 1e-5,
        `cavity obstructed at ${x}, ${z}: height ${hits[0].point.y}`);
    }
  }
});

test('interior walls have inward-facing geometry on all four sides', async () => {
  const scene = await chest();
  for (const [x,z,distance] of [[1,0,.65],[-1,0,.65],[0,1,.4],[0,-1,.4]]) {
    const hits = new Raycaster(new Vector3(0,.35,0), new Vector3(x,0,z)).intersectObject(scene);
    assert.ok(hits.length);
    assert.ok(Math.abs(hits[0].distance-distance) < 1e-5);
  }
});

test('closed lid covers the opening and the exterior keeps its original dimensions', async () => {
  const scene = await chest(false);
  const hits = new Raycaster(new Vector3(0,2,0), new Vector3(0,-1,0)).intersectObject(scene);
  assert.ok(Math.abs(hits[0].point.y-1) < 1e-5);
  const bounds = new Box3().setFromObject(scene);
  assert.ok(bounds.min.distanceTo(new Vector3(-.765,-.02,-.54)) < 1e-5);
  assert.ok(bounds.max.distanceTo(new Vector3(.765,1.04,.605)) < 1e-5);
  const underside = new Raycaster(new Vector3(0,.8,0), new Vector3(0,1,0)).intersectObject(scene);
  assert.ok(Math.abs(underside[0].point.y-.93) < 1e-5, 'lid has a recessed underside');
});
