import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { landscapeLayout, landscapeColliders } from "../src/game/landscape";
import { Simulation } from "../src/game/simulation";
import { FIELD_CHESTS, LANDING } from "../src/game/expedition";
import { occupied, lineClear } from "../src/game/collision";
test("landscape is merged, bounded, and preserves city and garden layers", () => {
  const b = readFileSync(
    new URL("../public/models/park-landscape.glb", import.meta.url),
  );
  const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
  assert.ok(b.length < 6_000_000);
  assert.ok(j.meshes.length <= 40);
  assert.ok(j.nodes.length < 100);
  for (const name of [
    "LandscapeRoot",
    "GardenEast",
    "GardenWest",
    "CityEast",
    "CityWest",
    "Paths",
  ])
    assert.ok(j.nodes.some((n: { name: string }) => n.name === name));
  assert.ok(landscapeLayout.filter((p) => p.kind === "tree").length >= 60);
});
test("solid landscape props have collision and preserve equipment/landing access", () => {
  for (const c of landscapeColliders) assert.ok(occupied([c], c.x, c.z, 0));
  const g = new Simulation();
  g.start();
  g.guards.forEach((e) => (e.hp = 0));
  for (const [x, z] of [
    [LANDING.heroX, LANDING.heroZ],
    [0, 160],
    [0, 130],
    [0, 100],
    [0, 70],
    [0, 40],
  ])
    assert.equal(g.blocked(x, z), false);
  for (const chest of FIELD_CHESTS)
    assert.ok(
      Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8,
          x = chest.x + Math.sin(a) * 2,
          z = chest.z + Math.cos(a) * 2;
        return (
          !g.blocked(x, z) &&
          lineClear(
            g.colliders,
            { x, y: 1.5, z },
            { x: chest.x, y: 1.5, z: chest.z },
            chest.id,
          )
        );
      }).some(Boolean),
      chest.id,
    );
});
