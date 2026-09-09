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

test("adventure assets contain isolated models and required animation pivots", () => {
  const assets = {
    "hero-sword": ["GearSword"],
    "hero-shield": ["GearShield"],
    "adventure-chest": ["AdventureChest", "LidPivot"],
    "adventure-lever": ["AdventureLever", "HandlePivot"],
    "adventure-crate": ["AdventureCrate"],
    "adventure-herb": ["AdventureHerb"],
  };
  for (const [file, names] of Object.entries(assets)) {
    const bytes = readFileSync(
      new URL(`../public/models/${file}.glb`, import.meta.url),
    );
    assert.equal(bytes.toString("ascii", 0, 4), "glTF");
    assert.ok(bytes.length < 100_000, file);
    const gltf = JSON.parse(
      bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
    );
    assert.equal(gltf.scenes.length, 1, file);
    assert.ok(!gltf.images?.length, file);
    for (const name of names)
      assert.ok(
        gltf.nodes.some((node: { name: string }) => node.name === name),
        name,
      );
  }
});
