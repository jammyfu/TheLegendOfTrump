import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
import { ATTACKS, SPIN, bladeDirection } from "../src/game/combat";
const idle = { x: 0, z: 0, sprint: false, guard: false };
function tick(g: Simulation, time: number) {
  for (let t = 0; t < time; t += 1 / 60) g.update(1 / 60, idle);
}
function quiet() {
  const g = new Simulation();
  g.start();
  g.guards.forEach((e) => (e.hp = 0));
  g.pots.forEach((p) => (p.broken = true));
  g.crates.forEach((p) => (p.broken = true));
  return g;
}
function charge(g: Simulation) {
  g.pressAttack();
  tick(g, ATTACKS[0].duration + SPIN.maxCharge + 0.3);
  assert.equal(g.chargeTime, SPIN.maxCharge);
}
test("combo blade travels down, left to right, then right to left", () => {
  for (const stage of [0, 1, 2]) {
    const before = bladeDirection(stage, ATTACKS[stage].hit - 0.055),
      after = bladeDirection(stage, ATTACKS[stage].hit + 0.08);
    if (stage === 0) assert.ok(before[1] > 0 && after[1] < 0);
    else
      assert.ok(
        stage === 1
          ? before[0] > 0 && after[0] < 0
          : before[0] < 0 && after[0] > 0,
      );
  }
});
test("tap attacks immediately; charged release hits both sides once and consumes stamina", () => {
  const g = quiet();
  g.pressAttack();
  assert.ok(g.attackTime > 0);
  g.releaseAttack();
  tick(g, 1);
  assert.equal(g.spinTime, 0);
  charge(g);
  g.guards = g.guards.slice(0, 2);
  g.guards.forEach((e, i) =>
    Object.assign(e, {
      hp: 3,
      x: g.x + (i ? 2.5 : -2.5),
      z: g.z,
      stun: 10,
      stunDuration: 10,
      cooldown: 10,
    }),
  );
  const stamina = g.stamina;
  g.releaseAttack();
  assert.equal(g.stamina, stamina - SPIN.cost);
  tick(g, 0.5);
  assert.deepEqual(
    g.guards.map((e) => e.hp),
    [1, 1],
  );
  tick(g, 1);
  assert.deepEqual(
    g.guards.map((e) => e.hp),
    [1, 1],
  );
  assert.equal(g.spinTime, 0);
  assert.equal(g.spinHitPending, false);
});
test("spin obeys walls and damages the indoor boss", () => {
  const g = quiet();
  charge(g);
  g.x = 0;
  g.z = -14;
  Object.assign(g.guards[0], {
    hp: 3,
    x: 0,
    z: -17,
    stun: 10,
    stunDuration: 10,
  });
  g.releaseAttack();
  tick(g, 0.5);
  assert.equal(g.guards[0].hp, 3);
  const b = quiet();
  charge(b);
  b.zone = "office";
  b.x = 0;
  b.z = 2;
  b.boss.reset();
  b.boss.state = "recover";
  b.boss.timer = 10;
  b.releaseAttack();
  tick(b, 0.5);
  assert.equal(b.boss.hp, 16);
});
test("charge cancels on pause, dodge, jump, lost pointer and insufficient stamina", () => {
  for (const cancel of ["pause", "dodge", "jump", "cancelCharge"] as const) {
    const g = quiet();
    charge(g);
    g[cancel]();
    g.releaseAttack();
    assert.equal(g.spinTime, 0, cancel);
    assert.equal(g.chargeTime, 0, cancel);
    assert.equal(g.attackHeld, false, cancel);
  }
  const g = quiet();
  g.stamina = 25;
  g.pressAttack();
  tick(g, 1);
  g.releaseAttack();
  assert.equal(g.spinTime, 0);
});
