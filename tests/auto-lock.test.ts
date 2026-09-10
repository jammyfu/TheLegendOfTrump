import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
const idle = { x: 0, z: 0, sprint: false };
function setup() {
  const g = new Simulation();
  g.start();
  // This combat fixture represents equipment already collected.
  g.swordUnlocked = g.shieldUnlocked = true;
  g.weapon = "sword";
  g.x = -20;
  g.z = 15;
  g.cameraYaw = 0;
  g.guards.forEach((e) => {
    e.hp = 0;
    e.stun = 100;
  });
  Object.assign(g.guards[0], { x: -20, z: 8, hp: 3 });
  return g;
}
test("nearby visible enemy is acquired without pressing a lock key", () => {
  const g = setup();
  g.update(0.05, idle);
  assert.equal(g.lockedTarget, 0);
  Object.assign(g.guards[1], { x: -20, z: 12, hp: 3 });
  for (let i = 0; i < 10; i++) g.update(0.05, idle);
  assert.equal(g.lockedTarget, 0);
  g.guards[0].hp = 0;
  g.update(0.05, idle);
  assert.equal(g.lockedTarget, 1);
});
test("manual release provides free look, attacking resumes auto aim", () => {
  const g = setup();
  g.update(0.05, idle);
  g.toggleLock();
  for (let i = 0; i < 30; i++) g.update(0.05, idle);
  assert.equal(g.lockedTarget, null);
  g.pressAttack();
  assert.equal(g.lockedTarget, 0);
});
test("auto lock ignores far and rear enemies until they are close threats", () => {
  const g = setup();
  g.guards[0].z = 22;
  g.update(0.05, idle);
  assert.equal(g.lockedTarget, null);
  g.guards[0].z = 18;
  g.acquireAutoTarget();
  assert.equal(g.lockedTarget, 0);
  g.lockedTarget = null;
  g.guards[0].z = -5;
  g.acquireAutoTarget();
  assert.equal(g.lockedTarget, null);
  g.weapon = "bow";
  g.acquireAutoTarget();
  assert.equal(g.lockedTarget, 0);
});
test("walls prevent acquisition and active boss is eligible indoors", () => {
  const g = setup();
  g.x = 0;
  g.z = -10;
  g.guards[0].x = 0;
  g.guards[0].z = -20;
  g.acquireAutoTarget();
  assert.equal(g.lockedTarget, null);
  g.zone = "office";
  g.x = 0;
  g.z = 3;
  g.boss.active = true;
  g.boss.x = 0;
  g.boss.z = -4;
  g.minions.forEach((e) => (e.hp = 0));
  g.acquireAutoTarget();
  assert.equal(g.lockedTarget, 100);
});
