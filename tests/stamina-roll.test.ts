import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
const idle = { x: 0, z: 0, sprint: false };
function fresh() {
  const g = new Simulation();
  g.start();
  g.guards.forEach((e) => (e.hp = 0));
  return g;
}
function tick(g: Simulation, n: number, input = idle) {
  for (let i = 0; i < n; i++) g.update(0.05, input);
}
test("stamina doubles across start, regeneration and boss retry", () => {
  const g = fresh();
  assert.equal(g.maxStamina, 200);
  assert.equal(g.stamina, 200);
  g.stamina = 195;
  tick(g, 20);
  assert.equal(g.stamina, 200);
  g.zone = "office";
  g.boss.reset();
  g.stamina = 0;
  g.retry();
  assert.equal(g.stamina, 200);
});
test("both sprint-direction input orders require jump to roll", () => {
  for (const first of [idle, { ...idle, x: 1 }, { ...idle, sprint: true }]) {
    const g = fresh();
    g.update(0.05, first);
    assert.equal(g.dodgeTime, 0);
    const chord = { x: 1, z: 0, sprint: true };
    g.update(0.05, chord);
    assert.equal(g.dodgeTime, 0);
    g.jump(chord);
    assert.ok(g.dodgeTime > 0);
    tick(g, 20, chord);
    assert.equal(g.dodgeTime, 0);
    g.update(0.05, { ...idle, x: 1 });
    g.update(0.05, chord);
    assert.equal(g.dodgeTime, 0);
    g.jump(chord);
    assert.ok(g.dodgeTime > 0);
  }
  const g = fresh();
  g.x = -20;
  g.z = 15;
  Object.assign(g.guards[0], { hp: 3, x: -20, z: 8, stun: 100 });
  g.lockedTarget = 0;
  g.update(0.05, { ...idle, x: 1 });
  assert.equal(g.dodgeTime, 0);
  g.jump({ ...idle, x: 1 });
  assert.equal(g.dodgeTime, 0);
  assert.equal(g.vy, 7.8);
});
test("standalone roll button falls back to a jump, and sprint without direction cannot roll", () => {
  for (const input of [idle, { ...idle, x: 1 }, { ...idle, sprint: true }]) {
    const g = fresh();
    g.dodge(input);
    assert.equal(g.dodgeTime, 0);
    assert.equal(g.vy, 7.8);
    assert.equal(g.stamina, 200);
  }
});
test("boss summon keeps a readable warning but finishes recovery within two seconds", () => {
  const g = fresh();
  g.zone = "office";
  g.boss.reset();
  g.boss.hp = 12;
  g.x = 14;
  g.z = 10;
  g.update(0.05, idle);
  assert.equal(g.summonTime, 1.2);
  tick(g, 24);
  assert.equal(g.minions.filter((e) => e.hp > 0).length, 2);
  assert.ok(g.boss.timer <= 0.55);
  tick(g, 12);
  assert.notEqual(g.boss.state, "recover");
});
