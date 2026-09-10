import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";

const idle = { x: 0, z: 0, sprint: false, guard: false };

function officeBoss(move: "dart" | "slam" | "sweep" | "wave") {
  const game = new Simulation();
  game.start();
  game.zone = "office";
  game.boss.reset();
  Object.assign(game.boss, { x: 0, z: 0, move, state: "chase", timer: 0, sequence: 0 });
  game.x = move === "dart" || move === "wave" ? 12 : 0;
  game.z = move === "dart" || move === "wave" ? 12 : 2;
  if (move === "slam") game.boss.sequence = 1;
  if (move === "sweep") game.boss.sequence = 3;
  // 3 chooses wave at range while avoiding the earlier slam-pursuit branch.
  if (move === "wave") game.boss.sequence = 3;
  return game;
}

test("every boss attack emits a one-time, move-specific wind-up cue", () => {
  const expected = {
    dart: "bossDartCharge", slam: "bossSlamCharge", sweep: "bossSweepCharge", wave: "bossWaveCharge",
  } as const;
  for (const move of Object.keys(expected) as (keyof typeof expected)[]) {
    const game = officeBoss(move);
    game.update(.02, idle);
    assert.ok(game.events.includes(expected[move]), move);
    game.events.length = 0;
    game.update(.02, idle);
    assert.equal(game.events.includes(expected[move]), false, move);
  }
});

test("boss releases retain their matching audio event", () => {
  for (const [move, event] of [["dart", "bossDartFire"], ["sweep", "bossSweepStrike"], ["wave", "bossWaveRelease"]] as const) {
    const game = officeBoss(move);
    Object.assign(game.boss, { move, state: "windup", timer: .01 });
    game.update(.02, idle);
    assert.ok(game.events.includes(event), move);
  }
});

test("summon and boss defeat emit their dedicated cues", () => {
  const game = officeBoss("wave");
  game.boss.hp = 12;
  game.update(.02, idle);
  assert.ok(game.events.includes("summon"));
  game.events.length = 0;
  game.boss.hp = 0;
  game["bossDefeated"]();
  assert.ok(game.events.includes("bossDefeat"));
});
