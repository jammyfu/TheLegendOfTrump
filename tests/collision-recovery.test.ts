import { test } from "node:test";
import assert from "node:assert/strict";
import { moveAndSlide, moveVertical, occupied } from "../src/game/collision";
import type { Collider } from "../src/game/world";
const enemy: Collider = { id: "guard-1", zone: "grounds", x: 0, z: 0, radius: 0.8, top: 3 };
test("enemy heads cannot be used as standing platforms", () => {
  const fall = moveVertical([enemy], 0, 0, 3.1, 2.95);
  assert.equal(fall.grounded, false);
  const recovered = moveAndSlide([enemy], 0, 0, fall.y, 0, 0, false);
  assert.ok(Math.hypot(recovered.x, recovered.z) >= 1.18);
  assert.equal(moveVertical([enemy], recovered.x, recovered.z, 2.95, -0.1).y, 0);
});
test("overlap recovery frees a stationary player without crossing a nearby wall", () => {
  const wall: Collider = { id: "wall", zone: "grounds", x: -1.2, z: 0, w: 0.2, d: 8, top: 6 };
  const colliders = [enemy, wall];
  const recovered = moveAndSlide(colliders, 0.15, 0, 0, 0, 0, true);
  assert.equal(occupied(colliders, recovered.x, recovered.z, 0), false);
  assert.ok(recovered.x > 0);
});
test("static crates remain usable as platforms", () => {
  const crate: Collider = { id: "crate-1", zone: "grounds", x: 0, z: 0, w: 2, d: 2, top: 1.4, walkable: true };
  assert.deepEqual(moveVertical([crate], 0, 0, 1.5, 1.3), { y: 1.4, grounded: true, hitCeiling: false });
});
