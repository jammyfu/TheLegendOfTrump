import test from "node:test";
import assert from "node:assert/strict";
import { combatMusicHold, musicTrack } from "../src/game/combatMusic";
test("battle track enters immediately and waits five seconds after disengagement", () => {
  let hold = combatMusicHold(0, 0.1, "playing", true, true);
  assert.equal(musicTrack("playing", hold > 0), 2);
  hold = combatMusicHold(hold, 4.9, "playing", true, false);
  assert.ok(hold > 0);
  hold = combatMusicHold(hold, 0.2, "playing", true, false);
  assert.equal(musicTrack("playing", hold > 0), 1);
});
test("pause preserves combat selection, terminal states and interior clear it", () => {
  assert.equal(combatMusicHold(3, 10, "paused", true, false), 3);
  for (const phase of ["title", "intro", "won", "lost"] as const)
    assert.equal(combatMusicHold(3, 0.1, phase, true, true), 0);
  assert.equal(combatMusicHold(3, 0.1, "playing", false, true), 0);
  assert.equal(musicTrack("title", true), 0);
  assert.equal(combatMusicHold(0.1, 0.1, "playing", true, true), 5);
});

test("arrival has an independent one-shot music selection", () => {
  assert.equal(musicTrack("title", false), 0);
  assert.equal(musicTrack("intro", false), 3);
  assert.equal(musicTrack("intro", true), 3);
  assert.equal(musicTrack("playing", false), 1);
});
