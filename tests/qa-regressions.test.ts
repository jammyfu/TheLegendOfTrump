import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
import { occupied, moveVertical, moveAndSlide, PLAYER_HEIGHT } from "../src/game/collision";
const idle = { x: 0, z: 0, sprint: false };
test("jumping onto an intact pot lands on its top without trapping the player", () => {
  const g = new Simulation();
  g.start();
  g.guards.forEach((e) => (e.hp = 0));
  g.x = -12;
  g.z = 11.4;
  g.jump();
  for (let i = 0; i < 60; i++)
    g.update(1 / 60, { ...idle, z: i < 22 ? -1 : 0 });
  assert.equal(occupied(g.colliders, g.x, g.z, g.y), false);
  assert.equal(g.y, 1.32);
  for (let i = 0; i < 30; i++) g.update(1 / 60, { ...idle, x: 1 });
  assert.ok(g.x > -10, "can walk off the pot");
});

test("vertical sweep stops a fast jump at a low ceiling and falls onto solid props", () => {
  const roof = {
    id: "roof",
    zone: "grounds" as const,
    x: 0,
    z: 0,
    w: 3,
    d: 3,
    bottom: 3.1,
    top: 3.5,
  };
  const jump = moveVertical([roof], 0, 0, 0, 2);
  assert.equal(jump.hitCeiling, true);
  assert.equal(jump.y, 3.1 - PLAYER_HEIGHT);
  assert.equal(occupied([roof], 0, 0, jump.y), false);
  const land = moveVertical([roof], 0, 0, 5, 0);
  assert.equal(land.y, 3.5);
  assert.equal(land.grounded, true);
});

test("swept collision filtering retains thin walls during a long diagonal move", () => {
  const wall = {
    id: "thin-wall",
    zone: "grounds" as const,
    x: 2,
    z: 0,
    w: 0.1,
    d: 10,
    top: 3,
  };
  const distant = Array.from({ length: 300 }, (_, i) => ({
    ...wall,
    id: `distant-${i}`,
    x: 100 + i,
  }));
  const result = moveAndSlide([wall, ...distant], 0, 0, 0, 10, 1, false);
  assert.ok(result.x < 1.6);
  assert.ok(result.z > 0.9);
  assert.equal(occupied([wall], result.x, result.z, result.y), false);
});
