import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
import { introPose, INTRO_DURATION } from "../src/game/intro";
import { constrainCamera } from "../src/game/camera";
import { rayFraction } from "../src/game/collision";
import type { Collider } from "../src/game/world";
const idle = { x: 0, z: 0, sprint: false };
function fresh() {
  const g = new Simulation();
  g.start();
  g.guards.forEach((e) => (e.hp = 0));
  return g;
}
test("sprint jump launches one forward roll, lands and cannot be extended in air", () => {
  const g = fresh();
  const input = { x: 1, z: 0, sprint: true };
  g.jump(input);
  assert.equal(g.grounded, false);
  assert.equal(g.dodgeTime, 0.55);
  assert.equal(g.stamina, 76);
  const velocity = g.vy;
  g.jump(input);
  assert.equal(g.vy, velocity);
  assert.equal(g.stamina, 76);
  for (let i = 0; i < 40; i++) g.update(1 / 60, idle);
  assert.equal(g.grounded, true);
  assert.equal(g.dodgeTime, 0);
  assert.ok(g.x > 3);
});
test("locked directional input rolls once per deflection, with stamina and collision", () => {
  const g = fresh();
  g.x = -20;
  g.z = 15;
  Object.assign(g.guards[0], { hp: 3, x: -20, z: 8, stun: 100 });
  g.lockedTarget = 0;
  g.update(0.016, { x: 1, z: 0, sprint: false });
  assert.ok(g.dodgeTime > 0);
  assert.ok(g.y > 0);
  for (let i = 0; i < 60; i++) g.update(1 / 60, { x: 1, z: 0, sprint: false });
  assert.equal(g.dodgeTime, 0);
  g.update(0.016, idle);
  g.stamina = 0;
  g.update(0.016, { x: 1, z: 0, sprint: false });
  assert.equal(g.dodgeTime, 0);
});
test("camera keeps near-plane clearance from walls, cylinders and initial overlaps", () => {
  const wall: Collider = {
    id: "wall",
    zone: "grounds",
    x: 0,
    z: 2,
    w: 12,
    d: 0.2,
    top: 8,
  };
  const safe = constrainCamera(
    [wall],
    { x: 0, y: 2, z: 0 },
    { x: 0, y: 2, z: 4 },
  );
  assert.ok(safe.z < 1.46);
  const overlap = constrainCamera(
    [wall],
    { x: 0, y: 2, z: 2 },
    { x: 0, y: 2, z: 2 },
  );
  assert.equal(rayFraction(wall, overlap, overlap, 0.45), null);
  const round: Collider = {
    id: "round",
    zone: "grounds",
    x: 0,
    z: 0,
    radius: 3,
    top: 8,
  };
  const outside = constrainCamera(
    [round],
    { x: 0, y: 2, z: 0 },
    { x: 0, y: 2, z: 0 },
  );
  assert.equal(rayFraction(round, outside, outside, 0.45), null);
});
test("entire helicopter handoff stays outside the aircraft at low and high frame rates", () => {
  for (const step of [1 / 20, 1 / 144])
    for (let t = 0; t <= INTRO_DURATION; t += step) {
      const p = introPose(INTRO_DURATION - t);
      const aircraft: Collider = {
        id: "heli",
        zone: "grounds",
        x: p.helicopter[0],
        z: p.helicopter[2],
        bottom: p.helicopter[1] - 0.6,
        top: p.helicopter[1] + 8,
        radius: 8.6,
      };
      const camera = constrainCamera(
        [aircraft],
        { x: p.target[0], y: p.target[1], z: p.target[2] },
        { x: p.camera[0], y: p.camera[1], z: p.camera[2] },
      );
      assert.equal(
        rayFraction(aircraft, camera, camera, 0.45),
        null,
        `time ${t}`,
      );
    }
  const before = introPose(8.001).camera,
    after = introPose(7.999).camera;
  assert.ok(Math.hypot(...before.map((v, i) => v - after[i])) < 0.02);
});
