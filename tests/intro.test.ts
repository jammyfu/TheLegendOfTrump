import { LANDING } from "../src/game/expedition";
import test from "node:test";
import assert from "node:assert/strict";
import { INTRO_DURATION, introPose } from "../src/game/intro";
import { Simulation } from "../src/game/simulation";
test('disembarkation holds a fixed wide shot then cuts to a fixed rear shot',()=>{
 const wide=introPose(INTRO_DURATION-5.5);
 for(const elapsed of [6,7,8,8.99]){
  const p=introPose(INTRO_DURATION-elapsed);
  assert.deepEqual(p.camera,wide.camera);
  assert.deepEqual(p.target,wide.target);
 }
 const rear=introPose(0);
 for(const elapsed of [9,9.1,9.5,10,10.9]){
  const p=introPose(INTRO_DURATION-elapsed);
  assert.deepEqual(p.camera,rear.camera);
  assert.deepEqual(p.target,rear.target);
 }
});
test('helicopter remains parked and rotor stops after disembarkation',()=>{
  for(const elapsed of [9,10,11,20]){
    const p=introPose(INTRO_DURATION-elapsed);
    assert.ok(Math.abs(p.helicopter[1]-.1)<1e-8);
    assert.equal(p.helicopter[0],LANDING.x);assert.equal(p.helicopter[2],LANDING.z);
    assert.equal(p.heading,Math.PI);
  }
  assert.equal(introPose(0).rotorSpeed,0);
  assert.ok(introPose(INTRO_DURATION-9).rotorSpeed>introPose(INTRO_DURATION-10).rotorSpeed);
});
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
  assert.deepEqual(end.hero, [LANDING.heroX, 0, LANDING.heroZ]);
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
    assert.equal(s.z, LANDING.heroZ);
    assert.equal(s.grounded, true);
  }
});

test("intro completes automatically without consuming movement input", () => {
  const s = new Simulation();
  s.beginIntro();
  for (let t = 0; t < INTRO_DURATION - 0.02; t += 0.05)
    s.update(0.05, { x: 1, z: 1, sprint: true });
  assert.equal(s.x, 0);
  assert.equal(s.z, LANDING.heroZ);
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
  assert.ok(at(9.1).door > 0);
  assert.equal(at(10).door, 0);
  assert.equal(at(11).stairs, 0);
});
