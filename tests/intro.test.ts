import test from "node:test";
import assert from "node:assert/strict";
import { INTRO_DURATION, introPose } from "../src/game/intro";
import { Simulation } from "../src/game/simulation";
test("arrival hides hero until landing and finishes at playable spawn", () => {
  const flight = introPose(INTRO_DURATION);
  assert.equal(flight.visible, false);
  assert.ok(flight.helicopter[1] > 15);
  const landing = introPose(INTRO_DURATION - 5.5);
  assert.ok(Math.abs(landing.helicopter[1] - 0.1) < 1e-8);
  assert.equal(landing.visible, false);
  const walking = introPose(INTRO_DURATION - 7);
  assert.equal(walking.visible, true);
  assert.equal(walking.walking, true);
  const end = introPose(0);
  assert.deepEqual(end.hero, [0, 0, 15]);
  assert.equal(end.walking, false);
});
test("skipping every cinematic stage restores grounded playable state", () => {
  for (const elapsed of [0, 3, 6, 8, 12, 14.9]) {
    const s = new Simulation();
    s.beginIntro();
    s.introTime = INTRO_DURATION - elapsed;
    s.skipIntro();
    assert.equal(s.phase, "playing");
    assert.equal(s.introTime, 0);
    assert.equal(s.x, 0);
    assert.equal(s.y, 0);
    assert.equal(s.z, 15);
    assert.equal(s.grounded, true);
  }
});

test("intro completes automatically without consuming movement input", () => {
  const s = new Simulation();
  s.beginIntro();
  for (let t = 0; t < INTRO_DURATION - 0.02; t += 0.05)
    s.update(0.05, { x: 1, z: 1, sprint: true });
  assert.equal(s.x, 0);
  assert.equal(s.z, 15);
  s.update(0.05, { x: 0, z: 0, sprint: false });
  assert.equal(s.phase, "playing");
});

test("boarding stairs deploy after the door starts opening and retract before departure", () => {
  const at = (t: number) => introPose(INTRO_DURATION - t);
  assert.equal(at(5.5).stairs, 0);
  assert.equal(at(5.5).door, 0);
  assert.ok(at(6).door > at(6).stairs);
  assert.ok(at(6).stairs > 0);
  assert.equal(at(6.5).stairs, 1);
  assert.equal(at(6.5).door, 1);
  assert.equal(at(6.5).visible, true);
  assert.equal(at(9.5).stairs, 0);
  assert.ok(at(9.5).door > 0);
  assert.equal(at(10).door, 0);
  assert.equal(at(11).stairs, 0);
});
