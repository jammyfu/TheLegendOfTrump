import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
import { interactions } from "../src/game/world";
import { UNARMED } from "../src/game/unarmed";
import { AERIAL } from "../src/game/aerialCombat";
import { Group } from "three";
import { mountEquipmentTier } from "../src/game/equipmentVisual";
function interact(g: Simulation, id: string) {
  const item = interactions.find(i => i.id === id)!;
  g.x = item.x; g.z = item.z + 2; g.y = 0; g.grounded = true;
  assert.equal(g.interaction?.id, id);
  g.interact();
}
test("wood starter gear can be put away for punches", () => {
  const g = new Simulation(); g.start();
  assert.equal(g.weapon, "none");
  assert.ok(!g.swordUnlocked && !g.shieldUnlocked);
  interact(g, "chest-wood-sword");
  assert.equal(g.pickupItem, "wood-sword");
  for(let i=0;i<40;i++) g.update(.05,{x:0,z:0,sprint:false});
  interact(g, "chest-wood-shield");
  assert.equal(g.pickupItem, "wood-shield");
  for(let i=0;i<40;i++) g.update(.05,{x:0,z:0,sprint:false});
  assert.equal(g.weapon, "sword");
  assert.ok(g.swordUnlocked && g.shieldUnlocked);
  assert.ok(!g.swordUpgraded && !g.shieldUpgraded);
  assert.equal(g.shieldCostMultiplier, 1.5);
  g.switchWeapon(); assert.equal(g.weapon, "none"); assert.equal(g.canGuard, false);
  g.switchWeapon(); assert.equal(g.weapon, "sword");
});
for (const gear of ["sword", "shield"] as const) {
  test(gear + " requires its own switch and defeated guards", () => {
    const g = new Simulation(); g.start();
    const chest = "chest-" + gear;
    const locked = interactions.find(i => i.id === chest)!;
    g.x = locked.x; g.z = locked.z + 2;
    assert.equal(g.interaction, undefined, "un-dropped reward chest cannot be opened");
    interact(g, "lever-" + gear);
    for (let i = 0; i < 17; i++) g.update(.05, { x: 0, z: 0, sprint: false });
    interact(g, chest); assert.equal(g.opened.has(chest), false);
    g.guards.forEach(enemy => { enemy.hp = 0; });
    interact(g, chest); assert.equal(g.opened.has(chest), true);
    assert.equal(g.swordUpgraded, gear === "sword");
    assert.equal(g.shieldUpgraded, gear === "shield");
    g.start(); assert.equal(g.equipmentSwitches.size, 0);
    assert.ok(!g.swordUpgraded && !g.shieldUpgraded);
  });
}
test("wood sword deals half the upgraded damage", () => {
  function damage(upgraded: boolean) {
    const g = new Simulation(); g.start(); g.swordUpgraded = upgraded;
    g.swordUnlocked = true; g.weapon = "sword";
    const enemy = g.guards.find(e => e.originX === -8 && e.originZ === 136)!;
    g.x = enemy.x; g.z = enemy.z + 1.2; g.yaw = Math.PI;
    const before = enemy.hp; g.strike(); return before - enemy.hp;
  }
  assert.equal(damage(false), .5); assert.equal(damage(true), 1);
});
test("every unarmed hit is weaker than an ordinary wooden sword hit", () => {
  for (const attack of [...UNARMED, AERIAL.flyingKick]) assert.ok(attack.damage < .5);
});
test("upgrades equip automatically and late starter chests never downgrade them", () => {
  const g = new Simulation(); g.start();
  g.guards.forEach(enemy => { enemy.hp = 0; });
  for (const gear of ["sword", "shield"]) {
    interact(g, "lever-" + gear);
    for (let i = 0; i < 17; i++) g.update(.05, { x: 0, z: 0, sprint: false });
    interact(g, "chest-" + gear);
    g.finishPickup();
  }
  assert.equal(g.weapon, "sword");
  g.weapon = "none";
  for (const gear of ["sword", "shield"]) {
    interact(g, "chest-wood-" + gear);
    g.finishPickup();
    assert.ok(g.swordUpgraded && g.shieldUpgraded);
    assert.equal(g.shieldCostMultiplier, 1);
    assert.equal(g.weapon, "sword");
  }
});
test("upgrading removes the wooden model from the character hierarchy", () => {
  const holder = new Group(), wood = new Group(), steel = new Group();
  mountEquipmentTier(holder, wood, steel, false);
  assert.equal(wood.parent, holder);
  mountEquipmentTier(holder, wood, steel, true);
  assert.equal(wood.parent, null);
  assert.deepEqual(holder.children, [steel]);
  mountEquipmentTier(holder, wood, steel, true);
  assert.equal(holder.children.length, 1);
});
