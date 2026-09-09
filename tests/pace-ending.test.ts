import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
import { SPIN } from "../src/game/combat";
test("walking and sprinting cover the faster distance without bypassing physics", () => {
  for (const sprint of [false, true]) {
    const g = new Simulation();
    g.start();
    g.guards.forEach((e) => (e.hp = 0));
    // Settle the initial sprint-roll chord before measuring sustained movement.
    for (let i = 0; i < 20; i++) g.update(0.05, { x: 0, z: -1, sprint });
    const z = g.z;
    for (let i = 0; i < 20; i++) g.update(0.05, { x: 0, z: -1, sprint });
    assert.ok(Math.abs(z - g.z - (sprint ? 9.5 : 5.6)) < 0.02);
  }
});
test("signing awards the FC once and a fresh adventure resets the reward", () => {
  const g = new Simulation();
  g.start();
  assert.equal(g.fcUnlocked, false);
  g.phase = "dialogue";
  g.interact();
  assert.equal(g.phase, "won");
  assert.equal(g.fcUnlocked, true);
  const events = g.events.length;
  g.interact();
  assert.equal(g.events.length, events);
  g.start();
  assert.equal(g.fcUnlocked, false);
  assert.equal(SPIN.turns, 2);
  assert.equal(SPIN.minCharge, 0.65);
  assert.equal(SPIN.duration, 0.65);
});
