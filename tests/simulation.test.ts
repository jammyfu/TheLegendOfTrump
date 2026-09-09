import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation.ts";
import { staticColliders } from "../src/game/world.ts";
import {
  moveAndSlide,
  occupied,
  cameraFraction,
  lineClear,
} from "../src/game/collision.ts";
const idle = { x: 0, z: 0, sprint: false };
function fresh() {
  const g = new Simulation();
  g.start();
  return g;
}
function tick(g: Simulation, seconds: number, input = idle) {
  for (let t = 0; t < seconds; t += 1 / 60) g.update(1 / 60, input);
}
function quiet() {
  const g = fresh();
  g.guards.forEach((e) => (e.hp = 0));
  return g;
}
test("camera-relative movement normalizes diagonals and pause freezes simulation", () => {
  const a = quiet(),
    b = quiet();
  tick(a, 1, { ...idle, x: 1 });
  tick(b, 1, { ...idle, x: 1, z: 1 });
  assert.ok(
    Math.abs(Math.hypot(a.x, a.z - 15) - Math.hypot(b.x, b.z - 15)) < 0.05,
  );
  a.pause();
  const x = a.x;
  tick(a, 1, { ...idle, x: 1 });
  assert.equal(a.x, x);
  const c = quiet();
  c.cameraYaw = Math.PI / 2;
  tick(c, 1, { ...idle, z: -1 });
  assert.ok(c.x < -4);
});
test("circle sweep stops tunneling and slides along walls", () => {
  const cs = [
    { id: "wall", zone: "grounds" as const, x: 0, z: 0, w: 0.2, d: 20, top: 4 },
  ];
  const p = moveAndSlide(cs, -2, -2, 0, 10, 4, false);
  assert.ok(p.x < -0.47);
  assert.ok(p.z > 1.8);
  assert.equal(occupied(cs, p.x, p.z, p.y), false);
});
test("fountain, hedges, trees, benches and office furniture are solid", () => {
  const g = quiet();
  g.x = 0;
  g.z = 6;
  tick(g, 1, { ...idle, z: -1 });
  assert.ok(g.z >= 5);
  for (const name of [
    "hedge-1-0-1",
    "tree-1--11",
    "bench-1-13",
    "desk",
    "sofa-1",
  ]) {
    const c = staticColliders.find((c) => c.id === name)!;
    assert.ok(c, name);
    assert.ok(occupied([c], c.x, c.z, 0), name);
  }
});
test("jump lands on crates, cannot double jump and falls after leaving ledge", () => {
  const g = quiet();
  g.x = -4;
  g.z = 10.5;
  g.jump();
  const stamina = g.stamina;
  g.jump();
  assert.equal(g.stamina, stamina);
  tick(g, 0.48, { ...idle, z: -1 });
  tick(g, 0.55);
  assert.ok(g.grounded);
  assert.ok(g.y > 1.3);
  tick(g, 0.6, { ...idle, x: 1 });
  tick(g, 1);
  assert.ok(g.y < 0.02);
  assert.ok(g.grounded);
});
test("camera boom contracts before a wall and expands when path clears", () => {
  const wall = {
    id: "wall",
    zone: "grounds" as const,
    x: 0,
    z: 4,
    w: 6,
    d: 0.4,
    top: 8,
  };
  const target = { x: 0, y: 2, z: 0 },
    camera = { x: 0, y: 4, z: 8 };
  assert.ok(cameraFraction([wall], target, camera) < 0.5);
  assert.equal(cameraFraction([], target, camera), 1);
  assert.equal(lineClear([wall], target, camera), false);
});
test("sword hit occurs after wind-up, obeys facing, wall occlusion and cooldown", () => {
  const g = quiet();
  g.x = -12;
  g.z = 12;
  g.y = 0.37;
  g.yaw = Math.PI;
  g.attack();
  assert.equal(g.gems, 0);
  tick(g, 0.17);
  assert.equal(g.gems, 2);
  g.attack();
  tick(g, 0.5);
  assert.equal(g.gems, 2);
  const b = quiet();
  b.x = -13;
  b.z = 1.7;
  b.pots[0].x = -13;
  b.pots[0].z = -0.4;
  b.yaw = Math.PI;
  b.attack();
  tick(b, 0.2);
  assert.equal(b.pots[0].broken, false, "closed gate blocks sword arc");
});
test("chest and herbs grant rewards only once; lever unlocks secret garden", () => {
  const g = quiet();
  g.x = 17;
  g.z = 7.7;
  g.interact();
  assert.equal(g.gems, 3);
  g.interact();
  assert.equal(g.gems, 3);
  g.x = -7;
  g.z = 2.7;
  g.interact();
  assert.equal(g.gateOpen, true);
  assert.ok(!g.colliders.some((c) => c.id === "garden-gate"));
  g.x = -13;
  g.z = -3;
  g.y = 0.37;
  g.interact();
  assert.equal(g.gems, 8);
  g.hp = 1;
  g.x = 18;
  g.z = 18.7;
  g.y = 0;
  g.interact();
  assert.equal(g.hp, 2);
  g.interact();
  assert.equal(g.hp, 2);
});
test("interaction does not pass through the closed garden gate", () => {
  const g = quiet();
  g.x = -13;
  g.z = 1.3;
  assert.equal(g.visible(-13, -1, "x"), false);
  g.gateOpen = true;
  assert.equal(g.visible(-13, -1, "x"), true);
});
test("guard telegraphs damage; directional block consumes stamina and dodge avoids strike", () => {
  const setup = () => {
    const g = quiet();
    g.x = 0;
    g.z = 12;
    const guard = g.guards[0];
    Object.assign(guard, {
      hp: 3,
      x: 0,
      z: 10.4,
      yaw: 0,
      windup: 0.1,
      cooldown: 0,
    });
    g.yaw = Math.PI;
    return g;
  };
  const hit = setup();
  tick(hit, 0.12);
  assert.equal(hit.hp, 2);
  const block = setup();
  tick(block, 0.12, { ...idle, guard: true });
  assert.equal(block.hp, 3);
  assert.ok(block.stamina <= 80);
  const dodge = setup();
  dodge.dodge({ ...idle, x: 1 });
  tick(dodge, 0.12);
  assert.equal(dodge.hp, 3);
  const back = setup();
  back.yaw = 0;
  tick(back, 0.12, { ...idle, guard: true });
  assert.equal(back.hp, 2);
});
test("stamina is bounded, depleted actions fail and recovery resumes after resting", () => {
  const g = quiet();
  g.stamina = 5;
  g.jump();
  g.dodge();
  g.attack();
  assert.equal(g.vy, 0);
  assert.equal(g.attackTime, 0);
  tick(g, 2);
  assert.ok(g.stamina > 40);
  tick(g, 10);
  assert.equal(g.stamina, 100);
});
test("door unlock and desk interaction still complete the adventure; restart resets all props", () => {
  const g = quiet();
  g.x = 0;
  g.z = -10.7;
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
  g.start();
  assert.equal(g.gems, 0);
  assert.equal(g.gateOpen, false);
  assert.equal(g.hp, 3);
});
test("lawn pickup route remains traversable around new props and hedges", () => {
  const g = quiet();
  for (const [x, z] of [
    [-5, 12],
    [-7, 8],
    [-8, 8],
    [-9, 3],
    [-7, -3],
    [-5, -9],
    [5, -9],
    [7, -3],
    [9, 3],
    [5, -9],
    [0, -10.7],
  ]) {
    for (let i = 0; i < 1500 && Math.hypot(g.x - x, g.z - z) > 0.16; i++) {
      const dx = x - g.x,
        dz = z - g.z,
        l = Math.hypot(dx, dz);
      g.update(1 / 60, { x: dx / l, z: dz / l, sprint: false });
    }
    assert.ok(
      Math.hypot(g.x - x, g.z - z) < 0.2,
      `unreachable ${x},${z}: ${g.x},${g.z}`,
    );
  }
  assert.ok(g.gems >= 8);
});
