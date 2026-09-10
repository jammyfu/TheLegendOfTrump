import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";

test("mobile action availability turns gray only for stamina-bound actions", () => {
  const game = new Simulation();
  game.start();
  game.stamina = 4;
  assert.equal(game.canMobileAttack, false);
  assert.equal(game.canMobileGuard, false);
  assert.equal(game.canMobileDodge, false);
  game.stamina = 5;
  assert.equal(game.canMobileAttack, true, "unarmed attack costs five stamina");
  game.swordUnlocked = true;
  game.weapon = "sword";
  assert.equal(game.canMobileAttack, false, "wood sword needs more stamina");
  game.shieldUnlocked = true;
  assert.equal(game.canMobileGuard, true);
  game.stamina = 24;
  assert.equal(game.canMobileDodge, true);
});

test("a bow without arrows is unavailable even with enough stamina", () => {
  const game = new Simulation();
  game.start();
  game.weapon = "bow";
  game.stamina = 30;
  assert.equal(game.canMobileAttack, false);
  game.arrows = 1;
  assert.equal(game.canMobileAttack, true);
});
