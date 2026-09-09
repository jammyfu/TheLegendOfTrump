import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
import { ENEMY_RULES } from "../src/game/expedition";
import { DEATH, deathPose, steerEnemy } from "../src/game/enemyMotion";
import { occupied } from "../src/game/collision";
const idle = { x: 0, z: 0, sprint: false };
function fresh() {
  const g = new Simulation();
  g.start();
  g.guards.forEach((e) => (e.hp = 0));
  return g;
}
function tick(g: Simulation, seconds: number) {
  for (let t = 0; t < seconds; t += 0.05) g.update(0.05, idle);
}
test("lethal melee begins a noninteractive fall, then reveals defeat; restart clears it", () => {
  const g = fresh();
  g.x = -20;
  g.z = 15;
  g.hp = 1;
  Object.assign(g.guards[0], {
    hp: 3,
    x: -20,
    z: 13.5,
    yaw: 0,
    windup: 0.01,
    cooldown: 0,
  });
  tick(g, 0.05);
  assert.equal(g.phase, "dying");
  assert.equal(g.hp, 0);
  assert.equal(g.deathTime, DEATH.player);
  g.attack();
  g.jump();
  g.dodge();
  assert.equal(g.attackTime, 0);
  assert.equal(g.dodgeTime, 0);
  tick(g, 1);
  assert.equal(g.phase, "dying");
  assert.equal(g.hp, 0);
  assert.equal(g.effects.length, 0);
  tick(g, 2);
  assert.equal(g.phase, "lost");
  g.start();
  assert.equal(g.deathTime, 0);
  assert.equal(g.phase, "playing");
});
test("lethal arrows share the same death sequence and cannot stack further damage", () => {
  const g = fresh();
  g.hp = 1;
  g.projectiles.push({
    owner: 3,
    x: g.x,
    y: 1.2,
    z: g.z + 0.3,
    vx: 0,
    vy: 0,
    vz: -10,
    life: 1,
    power: 1,
  });
  tick(g, 0.05);
  assert.equal(g.phase, "dying");
  assert.equal(g.projectiles.length, 0);
});
test("larger enemy bodies and longer awareness cause a visible pursuit and search", () => {
  const g = fresh();
  g.x = -20;
  g.z = 15;
  const e = g.guards[0];
  Object.assign(e, {
    hp: 3,
    x: -20,
    z: 3,
    originX: -20,
    originZ: 3,
    cooldown: 20,
  });
  const c = g.colliders.find((c) => c.id === "guard-0")!;
  assert.equal(c.radius, 0.48 * ENEMY_RULES.sentinel.scale);
  tick(g, 0.2);
  assert.ok(e.z > 3);
  assert.ok((e.alertUntil ?? 0) > g.elapsed);
  const seen = e.lastSeenZ;
  g.x = 200;
  tick(g, 0.05);
  assert.equal(e.lastSeenZ, seen);
});
test("blocked steering takes a lateral step without entering the obstacle", () => {
  const wall = {
    id: "wall",
    zone: "grounds" as const,
    x: 0,
    z: 0,
    w: 0.4,
    d: 4,
    top: 3,
  };
  const p = steerEnemy([wall], -0.7, 0, 0.3, 0, 0.48, 1);
  assert.ok(Math.abs(p.z) > 0.05);
  assert.equal(occupied([wall], p.x, p.z, 0, 0.48), false);
});
test("death poses fall first, hold on ground and only fade at the end", () => {
  const first = deathPose(DEATH.enemy, DEATH.enemy),
    middle = deathPose(1.1, DEATH.enemy),
    last = deathPose(0.2, DEATH.enemy);
  assert.equal(first.fall, 0);
  assert.equal(middle.fall, 1);
  assert.equal(middle.opacity, 1);
  assert.ok(last.opacity < 0.3);
});
