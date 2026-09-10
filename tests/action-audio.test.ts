import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
const idle = { x: 0, z: 0, sprint: false };
function fresh() {
  const g = new Simulation(); g.start();
  g.guards.forEach(e => e.hp = 0);
  g.x = -20; g.z = 15;
  g.swordUnlocked = true; g.weapon = "sword";
  g.events.length = 0;
  return g;
}
test("sword sounds at swing time, and an empty swing has no contact sound", () => {
  const g = fresh(); g.attack();
  assert.ok(g.attackTime > 0);
  assert.deepEqual(g.events, []);
  g.update(.05, idle);
  assert.ok(!g.events.includes("sword"));
  for (let i = 0; i < 15; i++) g.update(.05, idle);
  assert.equal(g.events.filter(e => e === "sword").length, 1);
  assert.ok(!g.events.some(e => e === "hit" || e === "heavy"));
});
test("jump and landing each emit once, standing still produces no steps", () => {
  const g = fresh(); g.jump(idle);
  for (let i = 0; i < 40; i++) g.update(.05, idle);
  assert.equal(g.events.filter(e => e === "jump").length, 1);
  assert.equal(g.events.filter(e => e === "land").length, 1);
  assert.ok(!g.events.includes("step"));
});
test("unavailable potion and weapon actions are silent", () => {
  const g = fresh(); g.potions = 0; g.bowUnlocked = false;
  g.usePotion(); g.switchWeapon();
  assert.deepEqual(g.events, []);
  g.hp = 1; g.potions = 1; g.usePotion();
  assert.deepEqual(g.events, ["heal"]);
});

test("fists and swords select different contact sounds", () => {
  for (const weapon of ["none", "sword"] as const) {
    const g = fresh(); g.weapon = weapon; g.yaw = 0;
    Object.assign(g.guards[0], { hp: 3, x: g.x, z: g.z + 1, stun: 10 });
    g.strike();
    assert.ok(g.guards[0].hp < 3);
    assert.ok(g.events.includes(weapon === "none" ? "punchHit" : "hit"));
    assert.ok(!g.events.includes(weapon === "none" ? "hit" : "punchHit"));
  }
});
