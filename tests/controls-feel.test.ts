import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
const idle = { x: 0, z: 0, sprint: false };
function fresh() {
  const g = new Simulation();
  g.start();
  // Combat scenarios begin after the two starting equipment pickups.
  g.swordUnlocked = g.shieldUnlocked = true;
  g.weapon = "sword";
  return g;
}
test("jump works without stamina and buffers a press just before landing", () => {
  const g = fresh();
  g.stamina = 0;
  g.jump();
  assert.ok(g.vy > 0);
  g.y = 0.04;
  g.vy = -3;
  g.grounded = false;
  g.coyoteTime = 0;
  g.jump();
  assert.equal(g.vy, -3);
  g.update(1 / 60, idle);
  assert.ok(g.vy > 0);
  assert.equal(g.jumpBuffer, 0);
  const v = g.vy;
  g.jump();
  assert.equal(g.vy, v);
});
test("ledge grace is consumed once and roll does not allow an early jump", () => {
  const g = fresh();
  g.grounded = false;
  g.coyoteTime = 0.08;
  g.jump();
  assert.ok(g.vy > 0);
  assert.equal(g.coyoteTime, 0);
  const h = fresh();
  h.dodge({ x: 1, z: 0, sprint: true });
  h.jump();
  h.update(1 / 60, idle);
  assert.equal(h.grounded, false);
  assert.ok(h.vy < 4.5);
});
test("mouse motion preserves lock and Boss can be locked", () => {
  const g = fresh();
  g.zone = "office";
  g.boss.reset();
  g.x = 0;
  g.z = 6;
  g.toggleLock();
  assert.equal(g.lockedTarget, 100);
  g.look(100, 10);
  assert.equal(g.lockedTarget, 100);
  g.toggleLock();
  assert.equal(g.lockedTarget, null);
});
test("held guard persists and resumes after a roll", () => {
  const g = fresh();
  const guard = { ...idle, guard: true };
  const stamina = g.stamina;
  for (let i = 0; i < 60; i++) {
    g.update(1 / 60, guard);
    assert.equal(g.guarding, true);
  }
  assert.ok(g.stamina < stamina, "holding guard should gradually spend stamina");
  g.dodge({ x: 1, z: 0, sprint: true });
  assert.equal(g.guarding, false);
  for (let i = 0; i < 40; i++) g.update(1 / 60, guard);
  assert.equal(g.guarding, true);
  g.update(1 / 60, idle);
  assert.equal(g.guarding, false);
});
test("a guarded hit removes one stamina section, while low stamina loses half a heart", () => {
  const guardInput = { ...idle, guard: true };
  const setupHit = (stamina: number) => {
    const g = fresh();
    g.guards.forEach((enemy) => (enemy.hp = 0));
    const attacker = g.guards.find((enemy) => enemy.kind !== "archer")!;
    g.x = -20;
    g.z = 15;
    g.yaw = Math.PI;
    g.stamina = stamina;
    Object.assign(attacker, {
      hp: 5,
      x: -20,
      z: 14,
      yaw: 0,
      cooldown: 0,
      windup: 0.01,
      attackTime: 0,
    });
    g.update(0, guardInput);
    return g;
  };
  const protectedHit = setupHit(100);
  protectedHit.update(0.01, guardInput);
  assert.equal(protectedHit.hp, 3);
  assert.ok(
    protectedHit.stamina <= 60 && protectedHit.stamina > 59,
    "a blocked strike should consume one 40-point stamina section plus the tiny hold drain",
  );

  const exhaustedHit = setupHit(39);
  exhaustedHit.update(0.01, guardInput);
  assert.equal(exhaustedHit.hp, 2.5, "a guard break from low stamina should cost half a heart");
  assert.equal(exhaustedHit.stamina, 0);
});
test("defense cancels swing recovery but preserves its active strike", () => {
  const g = fresh();
  g.attack();
  g.update(0.05, { ...idle, guard: true });
  assert.ok(g.attackTime > 0);
  for (let i = 0; i < 15; i++) g.update(1 / 60, { ...idle, guard: true });
  assert.equal(g.guarding, true);
  assert.equal(g.attackTime, 0);
});
