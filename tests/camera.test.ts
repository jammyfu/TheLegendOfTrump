import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraBoom,
  indoorFrame,
  cameraObstacles,
  recoverBoom,
  responsiveFov,
  sanitizeCamera,
} from "../src/game/camera.ts";
import { Simulation } from "../src/game/simulation.ts";
test("portrait preserves horizontal context and camera settings clamp invalid values", () => {
  assert.equal(responsiveFov(60, 16 / 9), 60);
  const portrait = responsiveFov(60, 390 / 844);
  assert.ok(portrait > 85 && portrait < 105);
  assert.deepEqual(
    sanitizeCamera({ distance: -1, fov: Infinity, sensitivity: 50 }),
    { distance: 5, fov: 60, sensitivity: 2, invertY: false, shake: true },
  );
});
test("camera ignores combatants, contracts at walls and recovers smoothly", () => {
  const target = { x: 0, y: 1.9, z: 0 };
  const wall = {
    id: "wall",
    zone: "grounds" as const,
    x: 0,
    z: 4,
    w: 20,
    d: 0.4,
    top: 12,
  };
  const guard = {
    id: "guard-0",
    zone: "grounds" as const,
    x: 0,
    z: 1,
    radius: 0.5,
    top: 3,
  };
  assert.equal(
    cameraBoom(cameraObstacles([guard]), target, 0, 0.3, 9.5).distance,
    9.5,
  );
  const safe = cameraBoom([wall], target, 0, 0.3, 9.5);
  assert.ok(safe.distance < 8);
  assert.ok(target.z + safe.direction.z * safe.distance < 3.8);
  assert.equal(recoverBoom(9.5, safe.distance, 0.016), safe.distance);
  const recovering = recoverBoom(safe.distance, 9.5, 0.016);
  assert.ok(recovering > safe.distance && recovering < 9.5);
});
test("distance preference survives zone restart; sensitivity and invert affect mouse", () => {
  const game = new Simulation();
  game.start();
  game.setCamera({ distance: 12, sensitivity: 2, invertY: true });
  const pitch = game.cameraPitch;
  game.look(10, 10);
  assert.ok(game.cameraPitch < pitch);
  assert.equal(game.cameraYaw, -0.08);
  game.start();
  assert.equal(game.cameraDistance, 12);
  game.zoom(-10000);
  assert.equal(game.cameraDistance, 5);
  game.look(0, 100000);
  assert.ok(game.cameraPitch >= 0.06);
});

test("expanded indoor arena keeps a full camera boom around the central fight", () => {
  const game = new Simulation();
  game.start();
  game.zone = "office";
  game.x = 0;
  game.z = 0;
  const obstacles = cameraObstacles(game.colliders);
  for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 8) {
    const frame = indoorFrame(game, yaw, 0.42, 9.5);
    const safe = cameraBoom(
      obstacles,
      frame.target,
      yaw,
      frame.pitch,
      frame.distance,
    );
    assert.ok(safe.distance > 10, `view compressed at yaw ${yaw}`);
  }
  assert.equal(game.blocked(7, 0), false);
  assert.equal(game.blocked(18.4, 0), true);
  assert.equal(game.blocked(18.4, 17.5), true);
  const frame = indoorFrame(game, 0, -2, 9.5, { x: 0, z: -8 });
  assert.equal(frame.target.z, -2.8);
  assert.equal(frame.pitch, 0.18);
});
