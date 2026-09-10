import test from "node:test";
import assert from "node:assert/strict";
import {
  LOCK_CAMERA,
  followLockYaw,
  lockRangeTime,
} from "../src/game/lockCamera";
import { cutawayFade, cutawaySide, obscuresSubject } from "../src/game/cutaway";
import { readFileSync } from "node:fs";
import { cameraObstacles, cameraBoom } from "../src/game/camera";
import { Simulation } from "../src/game/simulation";

const idle = { x: 0, z: 0, sprint: false };
test("shipped room names keep their wall direction after Blender export and glTF sanitizing", () => {
  const bytes = readFileSync(new URL('../public/models/oval-cutaway.glb', import.meta.url));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const walls = gltf.nodes.filter((n: { name?: string }) => n.name?.startsWith('OfficeCutaway_'));
  assert.equal(walls.length, 5);
  for (const node of walls) {
    const side = node.name.match(/^OfficeCutaway_([a-z]+)/)[1];
    assert.equal(cutawaySide(node.name), side);
    assert.equal(cutawaySide(node.name.replaceAll('.', '')), side);
  }
  assert.equal(cutawaySide('OfficeFurnishing001'), undefined);
});

test("rear windows fade behind the desk and restore when looking from inside the room", () => {
  const rear = { min: { x: -35, y: 0, z: -32 }, max: { x: 35, y: 20, z: -30 } };
  const hero = { x: 0, y: 1.65, z: -25 };
  const side = cutawaySide('OfficeCutaway_back001');
  for (const camera of [{x: 0, y: 5, z: -38}, {x: 7, y: 6, z: -31}]) {
    assert.equal(obscuresSubject(rear, camera, hero, .55, side), true);
  }
  assert.equal(obscuresSubject(rear, {x: 0, y: 5, z: -12}, hero, .55, side), false);
  const west = { min: {x: -36, y: 0, z: -32}, max: {x: -34, y: 20, z: 32} };
  assert.equal(obscuresSubject(west, {x: -40, y: 5, z: -25},
    {x: -31, y: 1.65, z: -25}, .55, cutawaySide('OfficeCutaway_west.001')), true);
  const ceiling = {min: {x: -35, y: 19, z: -32}, max: {x: 35, y: 20, z: 32}};
  assert.equal(obscuresSubject(ceiling, {x: 0, y: 24, z: -25}, hero,
    .55, cutawaySide('OfficeCutaway_ceiling001')), true);
});

test("range tolerance recovers inside inner radius and releases after sustained retreat", () => {
  assert.equal(lockRangeTime(29, 0, 0.1), 0);
  assert.equal(lockRangeTime(31, 0, 0.1), 0.1);
  assert.equal(lockRangeTime(29, 0.1, 0.1), 0.2);
  assert.equal(lockRangeTime(26, 0.2, 0.1), 0);
  const game = new Simulation();
  game.start();
  game.x = -20;
  game.z = 15;
  game.invincible = 100;
  game.guards.forEach((g) => {
    g.hp = 0;
  });
  const enemy = game.guards[0];
  enemy.hp = 4;
  enemy.stun = 100;
  enemy.x = -20;
  enemy.z = 12;
  game.toggleLock();
  assert.equal(game.lockedTarget, enemy.id);
  enemy.z = -16;
  for (let i = 0; i < 10; i++) game.update(0.05, idle);
  assert.equal(game.lockedTarget, enemy.id);
  enemy.z = -11;
  game.update(0.05, idle);
  assert.equal(game.lockRangeElapsed, 0);
  enemy.z = -16;
  for (let i = 0; i < 15; i++) game.update(0.05, idle);
  assert.equal(game.lockedTarget, null);
});

test("occlusion does not release a living in-range target or let melee steal the lock", () => {
  const game = new Simulation();
  game.start();
  game.guards.forEach((g) => {
    g.hp = 0;
  });
  const enemy = game.guards[0];
  enemy.hp = 4;
  enemy.stun = 100;
  enemy.x = 0;
  enemy.z = -20;
  game.x = 0;
  game.z = -10;
  game.lockedTarget = enemy.id;
  assert.equal(game.visible(enemy.x, enemy.z, "guard-" + enemy.id), false);
  for (let i = 0; i < 40; i++) game.update(0.05, idle);
  assert.equal(game.lockedTarget, enemy.id);
  game.x = -20;
  game.z = 15;
  game.yaw = Math.PI;
  enemy.x = -20;
  enemy.z = 5;
  const nearby = game.guards[1];
  nearby.hp = 4;
  nearby.x = -20;
  nearby.z = 13;
  game.swordUnlocked = true;
  game.weapon = "sword";
  game.attack();
  assert.equal(game.lockedTarget, enemy.id);
});

test("lock camera ignores jitter and bounds a 180 degree crossing at every frame rate", () => {
  assert.equal(followLockYaw(0, 0.05, 4, 1 / 60), 0);
  assert.equal(followLockYaw(0, Math.PI, 0.5, 1 / 60), 0);
  const outcomes: number[] = [];
  for (const fps of [30, 60, 144]) {
    let yaw = 0;
    for (let i = 0; i < fps; i++) {
      const next = followLockYaw(yaw, Math.PI, 3, 1 / fps);
      assert.ok(Math.abs(next - yaw) <= LOCK_CAMERA.maxSpeed / fps + 1e-8);
      yaw = next;
    }
    outcomes.push(yaw);
  }
  assert.ok(Math.max(...outcomes) - Math.min(...outcomes) < 0.05);
  assert.ok(
    followLockYaw(Math.PI - 0.02, -Math.PI + 0.2, 4, 0.02) > Math.PI - 0.02,
  );
});

test("cutaway hides only intersecting walls, holds at edges, then restores", () => {
  const wall = { min: { x: 14, y: 0, z: -15 }, max: { x: 15, y: 8, z: 15 } };
  const hero = { x: 10, y: 1.7, z: 0 };
  assert.equal(obscuresSubject(wall, { x: 19, y: 5, z: 0 }, hero), true);
  assert.equal(obscuresSubject(wall, { x: 5, y: 5, z: 0 }, hero), false);
  assert.equal(
    obscuresSubject(
      wall,
      { x: 5, y: 5, z: 0 },
      { x: 13.8, y: 1.7, z: 0 },
      0.55,
      "east",
    ),
    false,
  );
  let state = { opacity: 1, hold: 0 };
  for (let i = 0; i < 30; i++)
    state = cutawayFade(state.opacity, state.hold, true, 1 / 60);
  assert.ok(state.opacity < 0.015);
  state = cutawayFade(state.opacity, state.hold, false, 0.1);
  assert.ok(state.opacity < 0.015);
  for (let i = 0; i < 120; i++)
    state = cutawayFade(state.opacity, state.hold, false, 1 / 60);
  assert.ok(state.opacity > 0.99);
  const game = new Simulation();
  game.start();
  game.zone = "office";
  const east = game.colliders.find((c) => c.id === "office-east")!;
  assert.equal(game.blocked(east.x, 0), true);
  const safe = cameraBoom(
    cameraObstacles(game.colliders),
    { x: east.x - 1.5, y: 2, z: 0 },
    Math.PI / 2,
    0.4,
    11,
  );
  assert.ok(safe.distance > 10);
});
