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
test("stamina is bounded, depleted combat actions fail while jumping stays available", () => {
  const g = quiet();
  g.stamina = 5;
  g.jump();
  g.dodge();
  g.attack();
  assert.ok(g.vy > 0);
  assert.equal(g.dodgeTime, 0);
  assert.equal(g.stamina, 5);
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
  g.boss.hp = 0; // Boss combat has dedicated coverage.
  g.x = 0;
  g.z = -5.25;
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

test("three-stage combo buffers one press, costs stamina per stage and resets after recovery", () => {
  const g = quiet();
  g.attack();
  g.attack(); // initial anticipation rejects button spam
  assert.equal(g.comboQueued, false);
  tick(g, 0.1);
  g.attack();
  g.attack();
  assert.equal(g.comboQueued, true);
  tick(g, 0.38);
  assert.equal(g.combo, 1);
  assert.equal(g.stamina, 83);
  tick(g, 0.12);
  g.attack();
  tick(g, 0.4);
  assert.equal(g.combo, 2);
  assert.equal(g.stamina, 71);
  g.attack();
  assert.equal(g.comboQueued, false);
  tick(g, 0.9);
  g.attack();
  assert.equal(g.combo, 0);
  const b = quiet();
  b.attack();
  tick(b, 0.85);
  b.attack();
  assert.equal(b.combo, 0, "expired chain restarts at slash one");
});
test("insufficient stamina and dodge cancel buffered chains without phantom damage", () => {
  const g = quiet();
  g.stamina = 8;
  g.attack();
  tick(g, 0.1);
  g.attack();
  tick(g, 0.4);
  assert.equal(g.combo, 0);
  assert.equal(g.attackTime, 0);
  assert.equal(g.comboQueued, false);
  const b = quiet();
  b.attack();
  tick(b, 0.1);
  b.attack();
  b.dodge();
  assert.equal(b.attackTime, 0);
  assert.equal(b.hitPending, false);
  tick(b, 0.7);
  assert.equal(b.comboQueued, false);
});
test("strikes interrupt enemy windup, stagger once per swing, then allow recovery", () => {
  const g = fresh();
  g.x = 0;
  g.z = 12;
  g.yaw = Math.PI;
  const enemy = g.guards[0];
  Object.assign(enemy, { x: 0, z: 10, windup: 0.6, hp: 10 });
  g.guards[1].hp = 0;
  g.attack();
  tick(g, 0.18);
  assert.equal(enemy.hp, 9);
  assert.equal(enemy.windup, 0);
  assert.ok(enemy.stun > 0.4);
  assert.ok(g.hitStop > 0);
  const attackTime = g.attackTime;
  g.update(0.01, idle);
  assert.equal(
    g.attackTime,
    attackTime,
    "impact briefly freezes the strike pose",
  );
  tick(g, 0.3);
  assert.equal(enemy.hp, 9, "one swing only damages once");
  assert.ok(enemy.z < 10, "enemy recoils away from impact");
  assert.equal(g.hp, 3, "staggered enemy cannot deal queued attack damage");
  tick(g, 1);
  assert.equal(enemy.stun, 0);
});
test("finisher has stronger stagger, collision-limited knockback and visible defeat", () => {
  const g = fresh();
  g.x = 0;
  g.z = 12;
  g.yaw = Math.PI;
  const enemy = g.guards[0];
  Object.assign(enemy, { x: 0, z: 10, hp: 1, windup: 0.5 });
  g.guards[1].hp = 0;
  g.combo = 1;
  g.comboWindow = 0.2;
  g.attack();
  tick(g, 0.3);
  assert.equal(enemy.hp, 0);
  assert.ok(enemy.stun > 0.85);
  assert.ok(enemy.defeatTime > 0);
  tick(g, 1);
  assert.equal(enemy.defeatTime, 0);
  const blocked = moveAndSlide(
    [{ id: "wall", zone: "grounds", x: 0, z: 0, w: 5, d: 0.5, top: 4 }],
    0,
    1,
    0,
    0,
    -8,
    false,
    0.48,
  );
  assert.ok(blocked.z >= 0.72);
});

test("combat feedback fires on contact, ends quickly, and buffered swings link sooner", () => {
  const g = fresh();
  g.x = 0;
  g.z = 12;
  g.yaw = Math.PI;
  Object.assign(g.guards[0], { x: 0.25, z: 10, hp: 10, cooldown: 5 });
  g.guards[1].hp = 0;
  g.attack();
  tick(g, 0.07);
  g.attack();
  assert.ok(g.z < 12, "sword anticipation steps forward");
  tick(g, 0.14);
  assert.ok(g.effects.length > 0);
  assert.ok(g.impactTime > 0);
  assert.ok(g.events.includes("hit"));
  tick(g, 0.3);
  assert.equal(g.combo, 1);
  tick(g, 1.2);
  assert.equal(g.effects.length, 0);
  assert.equal(g.impactTime, 0);
  const empty = quiet();
  empty.attack();
  tick(empty, 0.3);
  assert.equal(
    empty.effects.length,
    0,
    "empty swings do not trigger impact effects",
  );
});
