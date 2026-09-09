import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RESIDENCE, ESTATE_BOUNDS, METRE } from "../src/game/estate";
import { Simulation } from "../src/game/simulation";
import { moveAndSlide } from "../src/game/collision";
import { introPose, INTRO_DURATION } from "../src/game/intro";
test("residence uses published proportions and merged landmark geometry", () => {
  assert.ok(Math.abs(RESIDENCE.width / METRE - 51.2) < 1e-8);
  assert.ok(Math.abs(RESIDENCE.depth / METRE - 26.1) < 1e-8);
  const b = readFileSync(
    new URL("../public/models/white-house-estate.glb", import.meta.url),
  );
  const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
  for (const name of [
    "EstateRoot",
    "Mansion",
    "WestWing",
    "EastWing",
    "Treasury",
    "Eisenhower",
    "WashingtonMonument",
    "CityBlocks",
    "Park",
  ])
    assert.ok(
      j.nodes.some((n: { name: string }) => n.name === name),
      name,
    );
  assert.ok(j.meshes.length < 60);
  assert.ok(j.nodes.length < 150);
  assert.ok(b.length < 4_000_000);
});
test("extended lawn is walkable beyond the old fence and the new perimeter is solid", () => {
  const g = new Simulation();
  g.start();
  g.guards.forEach((g) => (g.hp = 0));
  for (const [x, z] of [
    [0, 40],
    [0, 100],
    [50, 100],
    [-50, 100],
    [0, 220],
    [70, -90],
  ])
    assert.equal(g.blocked(x, z), false, `${x},${z}`);
  for (const [x, z] of [
    [140, 100],
    [-140, 100],
    [0, 235],
    [0, -160],
    [0, -35],
    [-104, -34],
    [105, -43],
  ])
    assert.equal(g.blocked(x, z), true, `${x},${z}`);
  const moved = moveAndSlide(g.colliders, 0, 230, 0, 0, 20, true);
  assert.ok(moved.z < ESTATE_BOUNDS.south);
});
test("historic facade entrance remains reachable and the expanded colonnade blocks at its own height", () => {
  const g = new Simulation();
  g.start();
  g.x = 0;
  g.z = -10.7;
  g.gems = 8;
  g.interact();
  assert.equal(g.zone, "office");
  g.zone = "grounds";
  const step = moveAndSlide(g.colliders, 0, -10.5, 0, 0, -2, true);
  assert.ok(step.z < -12);
  assert.ok(step.y > 0);
  const c = g.colliders.find((c) => c.id === "estate-colonnade-1-0")!;
  assert.equal(g.blocked(c.x, c.z), true);
});
test("helicopter arrival stays on the lawn side of the larger mansion", () => {
  for (let t = 0; t < INTRO_DURATION; t += 0.1) {
    const p = introPose(INTRO_DURATION - t);
    assert.ok(p.helicopter[2] >= 18 - 0.0001);
  }
});
