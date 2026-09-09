import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
import { AERIAL, aerialPose } from "../src/game/aerialCombat";
const idle = { x: 0, z: 0, sprint: false, guard: false };
function setup(sword: boolean) {
  const g = new Simulation();
  g.start();
  Object.assign(g, { x: 0, z: 145, y: 1.7, vy: 0, grounded: false, yaw: 0, autoLockCooldown: 100, swordUnlocked: sword, weapon: sword ? "sword" : "none" });
  g.guards.forEach(e => e.hp = 0);
  Object.assign(g.guards[0], { hp: 10, x: 0, z: 147, stun: 100 });
  return g;
}
for (const sword of [false, true]) test(sword ? "jump slash uses aerial timing, damage and stamina" : "airborne unarmed attack is a flying kick", () => {
  const g = setup(sword), kind = sword ? "jumpSlash" : "flyingKick";
  g.attack();
  assert.equal(g.airAttack, kind);
  assert.equal(g.stamina, g.maxStamina - AERIAL[kind].cost);
  assert.equal(g.guards[0].hp, 10);
  for (let i = 0; i < 18; i++) g.update(0.02, idle);
  assert.equal(g.guards[0].hp, 10 - AERIAL[kind].damage);
  assert.ok(g.guards[0].stun > 0);
});
test("aerial action cannot hit targets far below or restart before landing", () => {
  const g = setup(true);
  g.y = 10;
  g.attack();
  g.strike();
  assert.equal(g.guards[0].hp, 10);
  g.attackTime = 0;
  g.cooldown = 0;
  const stamina = g.stamina;
  g.attack();
  assert.equal(g.stamina, stamina);
  assert.equal(g.attackTime, 0);
});
test("aerial pose extends the kick and recovers after contact", () => {
  assert.ok(aerialPose("flyingKick", 0.23).strike > 0.9);
  assert.equal(aerialPose("flyingKick", AERIAL.flyingKick.duration).strike, 0);
});
test("walls block aerial hits and landing re-enables the next jump attack", () => {
  const g = setup(true);
  Object.defineProperty(g, "colliders", { configurable: true, get: () => [{ id: "wall", zone: "grounds", x: 0, z: 146, w: 8, d: 0.2, top: 8 }] });
  g.attack();
  g.strike();
  assert.equal(g.guards[0].hp, 10);
  delete (g as any).colliders;
  for (let i = 0; i < 90; i++) g.update(0.02, idle);
  assert.equal(g.grounded, true);
  assert.equal(g.airAttackUsed, false);
  assert.equal(g.airAttack, null);
  g.jump();
  g.attack();
  assert.equal(g.airAttack, "jumpSlash");
});
