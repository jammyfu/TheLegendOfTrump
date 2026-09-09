import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("shipped Blender character contains only the intended scene and animation pivots", () => {
  const bytes = readFileSync(
    new URL("../public/models/trump-n64.glb", import.meta.url),
  );
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.ok(bytes.length < 200_000);
  const length = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + length));
  assert.equal(gltf.scenes.length, 1);
  assert.equal(gltf.scenes[0].name, "Trump_Video_Character");
  assert.equal(gltf.meshes.length, 7);
  assert.ok(gltf.nodes.length < 30);
  for (const name of [
    "TrumpRoot",
    "LeftArmPivot",
    "RightArmPivot",
    "LeftLegPivot",
    "RightLegPivot",
    "HeadPivot",
    "SwordPivot",
  ])
    assert.ok(
      gltf.nodes.some((n: { name: string }) => n.name === name),
      name,
    );
  assert.ok(
    !gltf.images?.length,
    "model should not load unrelated image assets",
  );
});
