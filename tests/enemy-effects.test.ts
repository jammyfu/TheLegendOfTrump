import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";

test("hammer contact emits one grounded boss burst even when the player evades", () => {
  const game = new Simulation();
  game.start();
  game.zone = "office";
  game.boss.reset();
  game.boss.move = "slam";
  game.boss.state = "windup";
  game.boss.timer = 0.01;
  game.x = 12;
  game.z = 12;
  game.update(0.03, { x: 0, z: 0, sprint: false });
  assert.equal(game.effects.filter((effect) => effect.ground).length, 1);
  assert.ok(game.events.includes("slam"));
});
