import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation.ts";
const idle = { x: 0, z: 0, sprint: false };
test("movement is frame-rate independent, diagonal-normalized and paused safely", () => {
  const a = new Simulation(),
    b = new Simulation();
  a.start();
  b.start();
  for (let i = 0; i < 60; i++) a.update(1 / 60, { ...idle, x: 1 });
  for (let i = 0; i < 30; i++) b.update(1 / 30, { ...idle, x: 1 });
  assert.ok(Math.abs(a.x - b.x) < 0.001);
  assert.ok(Math.abs(a.x - 4.5) < 0.001);
  a.pause();
  a.update(0.05, { ...idle, x: 1 });
  assert.ok(Math.abs(a.x - 4.5) < 0.001);
});
test("fountain and perimeter are solid; movement slides along obstruction", () => {
  const g = new Simulation();
  g.start();
  g.x = 0;
  g.z = 5;
  for (let i = 0; i < 120; i++) g.update(1 / 60, { ...idle, z: -1 });
  assert.ok(g.z >= 4.9);
  g.x = 19.9;
  g.update(0.05, { ...idle, x: 1 });
  assert.ok(g.x <= 20);
});
test("pickup cannot be duplicated, locked entry stays closed, unlock transitions to office", () => {
  const g = new Simulation();
  g.start();
  g.x = -5;
  g.z = 12;
  g.update(0.02, idle);
  g.update(0.02, idle);
  assert.equal(g.gems, 1);
  g.x = 0;
  g.z = -12;
  g.interact();
  assert.equal(g.zone, "grounds");
  g.gems = 8;
  g.interact();
  assert.equal(g.zone, "office");
  g.x = 0;
  g.z = -2;
  g.interact();
  assert.equal(g.phase, "dialogue");
  g.interact();
  assert.equal(g.phase, "won");
});
test("sword respects direction, cooldown and single rewards", () => {
  const g = new Simulation();
  g.start();
  g.x = -12;
  g.z = 12;
  g.yaw = 0;
  g.attack();
  assert.equal(g.gems, 0);
  g.update(0.05, idle);
  g.yaw = Math.PI;
  g.attack();
  assert.equal(g.gems, 0);
  for (let i = 0; i < 10; i++) g.update(0.05, idle);
  g.attack();
  assert.equal(g.gems, 2);
  for (let i = 0; i < 10; i++) g.update(0.05, idle);
  g.attack();
  assert.equal(g.gems, 2);
});
test("guards cause damage with grace period and death is restartable", () => {
  const g = new Simulation();
  g.start();
  for (let hit = 0; hit < 3; hit++) {
    g.invincible = 0;
    g.x = g.guards[0].originX + Math.sin((g.elapsed + 0.01) * 0.55) * 2;
    g.z = Math.cos((g.elapsed + 0.01) * 0.55) * 3;
    g.update(0.01, idle);
  }
  assert.equal(g.hp, 0);
  assert.equal(g.phase, "lost");
  g.start();
  assert.equal(g.hp, 3);
  assert.equal(g.gems, 0);
  assert.equal(g.phase, "playing");
  assert.ok(g.pots.every((p) => !p.broken));
});
test("complete lawn route is reachable with movement, without teleporting or losing all hearts", () => {
  const g = new Simulation();
  g.start();
  for (const [x, z] of [
    [-5, 12],
    [-8, 8],
    [-9, 3],
    [-7, -3],
    [-5, -9],
    [5, -9],
    [7, -3],
    [9, 3],
    [5, -9],
    [0, -12],
  ]) {
    for (let i = 0; i < 1600 && Math.hypot(g.x - x, g.z - z) > 0.15; i++) {
      const dx = x - g.x,
        dz = z - g.z,
        l = Math.hypot(dx, dz);
      g.update(1 / 60, { x: dx / l, z: dz / l, sprint: false });
    }
    assert.ok(
      Math.hypot(g.x - x, g.z - z) < 0.2,
      `unreachable waypoint ${x},${z}`,
    );
  }
  assert.ok(g.hp > 0);
  assert.ok(g.gems >= 8);
  g.interact();
  assert.equal(g.zone, "office");
});
