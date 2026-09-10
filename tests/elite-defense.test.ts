import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
import { ATTACKS } from "../src/game/combat";
import { Boss } from "../src/game/boss";

function armedGame() {
  const game = new Simulation();
  game.start();
  game.swordUnlocked = true;
  game.weapon = "sword";
  game.guards.forEach((guard) => { guard.hp = 0; });
  return game;
}

test("a ready armored enemy occasionally catches a frontal hit on hard", () => {
  const game = armedGame();
  game.difficulty = "hard";
  const guard = game.guards.find((candidate) => candidate.kind === "brute")!;
  Object.assign(guard, { hp: 10, x: -20, z: 16, yaw: Math.PI, cooldown: 0, windup: 0, attackTime: 0, stun: 0 });
  game.x = -20;
  game.z = 15;
  game.yaw = 0;
  let blocked = false;
  for (let attempt = 0; attempt < 8 && !blocked; attempt++) {
    guard.hp = 10;
    guard.cooldown = guard.windup = guard.attackTime = guard.stun = 0;
    game.events.length = 0;
    game.strike();
    blocked = guard.hp === 10 && game.events.includes("block");
  }
  assert.equal(blocked, true);
});

test("heavy armor and the boss recover from stagger sooner", () => {
  const game = armedGame();
  const guard = game.guards.find((candidate) => candidate.kind === "brute")!;
  Object.assign(guard, { hp: 10, x: -20, z: 16, cooldown: 1 });
  game.x = -20;
  game.z = 15;
  game.yaw = 0;
  game.strike();
  assert.equal(guard.stun, ATTACKS[0].stun * 0.42);

  const boss = new Boss();
  boss.reset();
  boss.state = "recover";
  boss.hit(true);
  assert.equal(boss.stagger, 0.22);
});
