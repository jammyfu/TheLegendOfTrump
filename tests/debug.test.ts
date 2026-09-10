import assert from "node:assert/strict";
import test from "node:test";
import { parseDebugOptions } from "../src/game/debug";

test("boss debug opens the office with a complete test kit", () => {
  const options = parseDebugOptions("?debug=boss&god=1&bossHp=7");
  assert.equal(options.enabled, true);
  assert.equal(options.boss, true);
  assert.equal(options.equipment, true);
  assert.equal(options.invincible, true);
  assert.equal(options.bossHp, 7);
});

test("debug options accept solo boss and clamp boss health", () => {
  const options = parseDebugOptions("?debug=solo&boss=1&bossHp=200");
  assert.equal(options.boss, true);
  assert.equal(options.noMinions, true);
  assert.equal(options.bossHp, 99);
});
