import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Simulation } from "../src/game/simulation";
import {
  LANDING,
  ENEMY_SPAWNS,
  FIELD_CHESTS,
  CAMPS,
} from "../src/game/expedition";
import { INTRO_DURATION, introPose } from "../src/game/intro";
import { occupied } from "../src/game/collision";
const idle = { x: 0, z: 0, sprint: false };
function fresh() {
  const g = new Simulation();
  g.start();
  return g;
}
function tick(g: Simulation, t: number, guard = false) {
  for (let n = 0; n < t; n += 1 / 60) g.update(1 / 60, { ...idle, guard });
}
function quiet() {
  const g = fresh();
  g.guards.forEach((e) => (e.hp = 0));
  return g;
}
test("remote landing, extraction turn and playable spawn use one world location", () => {
  const g = fresh();
  assert.equal(g.z, LANDING.heroZ);
  assert.ok(g.z > 150);
  assert.equal(g.blocked(g.x, g.z), false);
  assert.ok(g.guards.every((e) => Math.hypot(e.x - g.x, e.z - g.z) > 30));
  const at = (t: number) => introPose(INTRO_DURATION - t);
  for (let t = 0; t < INTRO_DURATION - 0.02; t += 0.02) {
    const a = at(t),
      b = at(t + 0.01),
      dx = b.helicopter[0] - a.helicopter[0],
      dz = b.helicopter[2] - a.helicopter[2];
    if (Math.hypot(dx, dz) > 0.00001)
      assert.ok(
        (Math.sin(a.heading) * dx + Math.cos(a.heading) * dz) /
          Math.hypot(dx, dz) >
          0.99,
        `nose follows travel at ${t}`,
      );
    assert.ok(Math.abs(a.heading - b.heading) < 0.03);
  }
  assert.equal(at(8).helicopter[0], LANDING.x);
  assert.equal(at(8).helicopter[2], LANDING.z);
  assert.ok(Math.abs(at(8).helicopter[1] - 0.1) < 1e-8);
  assert.equal(at(11.5).helicopter[2], LANDING.z);
  assert.ok(at(12).helicopter[1] > 10);
  assert.equal(at(13.5).heading, 2 * Math.PI);
  assert.deepEqual(at(INTRO_DURATION).hero, [LANDING.heroX, 0, LANDING.heroZ]);
});
test("all enemy spawns and camp treasure have traversable approaches", () => {
  const g = fresh();
  assert.equal(g.guards.length, 14);
  for (const e of g.guards)
    assert.equal(
      occupied(
        g.colliders.filter((c) => c.id !== "guard-" + e.id),
        e.x,
        e.z,
        0,
        0.48,
      ),
      false,
      `spawn ${e.id}`,
    );
  g.guards.forEach((e) => (e.hp = 0));
  for (const c of FIELD_CHESTS)
    assert.ok(
      Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8;
        return !g.blocked(c.x + Math.sin(a) * 2, c.z + Math.cos(a) * 2);
      }).some(Boolean),
      c.id,
    );
  assert.equal(CAMPS.length, 5);
  assert.equal(new Set(ENEMY_SPAWNS.map((e) => e.kind)).size, 3);
});
test("landing equipment is one-time, currency purchases are bounded and potions consume inventory", () => {
  const g = quiet();
  g.x = 5;
  g.z = 176;
  g.interact();
  assert.ok(g.bowUnlocked);
  assert.equal(g.coins, 8);
  assert.equal(g.potions, 1);
  assert.equal(g.arrows, 12);
  g.interact();
  assert.equal(g.coins, 8);
  g.x = 10;
  g.z = 157.4;
  g.interact();
  assert.equal(g.coins, 0);
  assert.equal(g.arrows, 18);
  g.interact();
  assert.equal(g.arrows, 18);
  assert.equal(g.coins, 0);
  g.hp = 1;
  g.usePotion();
  assert.equal(g.hp, 3);
  assert.equal(g.potions, 0);
  g.usePotion();
  assert.equal(g.potions, 0);
  g.coins = 24;
  g.potions = 3;
  g.x = 13;
  g.interact();
  assert.equal(g.coins, 24);
  g.start();
  assert.equal(g.coins, 0);
  assert.equal(g.potions, 0);
  assert.equal(g.bowUnlocked, false);
});
test("occupied camps lock treasure, kills and crates drop finite spendable coins", () => {
  const g = fresh();
  g.x = -45;
  g.z = 120;
  g.interact();
  assert.ok(!g.opened.has("chest-patrol"));
  g.guards.forEach((e) => (e.hp = 0));
  g.interact();
  assert.ok(g.opened.has("chest-patrol"));
  assert.equal(g.coins, 20);
  g.interact();
  assert.equal(g.coins, 20);
  const e = g.guards[2];
  Object.assign(e, { hp: 1, x: 0, z: 151, stun: 0 });
  g.x = 0;
  g.z = 153;
  g.yaw = Math.PI;
  g.strike();
  assert.equal(e.hp, 0);
  const count = g.coinDrops.length;
  g.strike();
  assert.equal(g.coinDrops.length, count);
  g.z = 151;
  tick(g, 0.1);
  assert.equal(g.coins, 28);
  tick(g, 0.1);
  assert.equal(g.coins, 28);
  const c = g.crates[3];
  g.x = c.x;
  g.z = c.z + 2;
  g.strike();
  assert.ok(c.broken);
  const drops = g.coinDrops.length;
  g.strike();
  assert.equal(g.coinDrops.length, drops);
});
function archer() {
  const g = quiet(),
    e = g.guards[3];
  Object.assign(e, {
    hp: 2,
    x: 0,
    z: 150,
    originX: 0,
    originZ: 150,
    cooldown: 0,
  });
  g.x = 0;
  g.z = 165;
  g.yaw = Math.PI;
  return { g, e };
}
test("archer telegraphs and fires a nonhoming shot that can be dodged or shielded", () => {
  const { g, e } = archer();
  tick(g, 0.05);
  assert.ok(e.windup > 1);
  assert.equal(g.projectiles.length, 0);
  tick(g, 1.18);
  assert.ok(g.projectiles.some((p) => p.owner === e.id));
  g.x = 4;
  tick(g, 1.5);
  assert.equal(g.hp, 3);
  const shield = archer();
  tick(shield.g, 2.35, true);
  assert.equal(shield.g.hp, 3);
  assert.ok(shield.g.events.includes("block"));
  assert.ok(shield.g.stamina < 100);
  const hit = archer();
  tick(hit.g, 2.35);
  assert.equal(hit.g.hp, 2);
  const stun = archer();
  tick(stun.g, 0.05);
  stun.g.x = 0;
  stun.g.z = 152;
  stun.g.strike();
  assert.equal(stun.e.windup, 0);
  assert.ok(stun.e.stun > 0);
});
test("hostile swept arrows hit cover before the player and never damage while paused", () => {
  const g = quiet();
  g.x = 46;
  g.z = 96;
  g.projectiles.push({
    owner: 3,
    x: 46,
    y: 1.2,
    z: 101,
    vx: 0,
    vy: 0,
    vz: -80,
    power: 0.5,
    life: 2,
  });
  tick(g, 0.1);
  assert.equal(g.hp, 3);
  assert.equal(g.projectiles.length, 0);
  g.projectiles.push({
    owner: 3,
    x: g.x,
    y: 1.2,
    z: g.z + 1,
    vx: 0,
    vy: 0,
    vz: -16,
    power: 0.5,
    life: 2,
  });
  g.pause();
  tick(g, 1);
  assert.equal(g.hp, 3);
  assert.equal(g.projectiles[0].life, 2);
});
test("south lawn route reaches forecourt through actual movement", () => {
  const g = quiet();
  for (const [x, z] of [
    [0, 160],
    [0, 130],
    [0, 100],
    [0, 70],
    [0, 40],
    [0, 20],
  ]) {
    for (let i = 0; i < 600 && Math.hypot(g.x - x, g.z - z) > 0.2; i++) {
      const d = Math.hypot(x - g.x, z - g.z);
      g.update(0.05, { x: (x - g.x) / d, z: (z - g.z) / d, sprint: false });
    }
    assert.ok(Math.hypot(g.x - x, g.z - z) < 0.3, `route ${x},${z}`);
  }
  assert.ok(g.coins > 0);
});
test("new Blender variants preserve joints and distinct bow/hammer equipment", () => {
  for (const [file, part] of [
    ["field-archer", "ArcherBow"],
    ["field-brute", "Heavy hammer head"],
    ["field-camp", "FieldCampRoot"],
  ]) {
    const b = readFileSync(
      new URL(`../public/models/${file}.glb`, import.meta.url),
    );
    const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
    assert.ok(b.length < 300000);
    assert.ok(
      j.nodes.some((n: { name: string }) => n.name === part),
      `${file}: ${part}`,
    );
    if (file !== "field-camp")
      for (const name of [
        "SentinelRoot",
        "SentinelWeapon",
        "SentinelLeftArm",
        "SentinelRightElbow",
      ])
        assert.ok(
          j.nodes.some((n: { name: string }) => n.name === name),
          name,
        );
  }
});
test("camp cannot heal inside an archer's firing range; heavy armor resists light stagger", () => {
  const g = quiet();
  g.x = 6;
  g.z = 156.5;
  g.hp = 1;
  const a = g.guards[3];
  Object.assign(a, { hp: 2, x: 6, z: 180 });
  g.interact();
  assert.equal(g.hp, 1);
  a.hp = 0;
  g.interact();
  assert.equal(g.hp, 3);
  const b = g.guards[8];
  Object.assign(b, { hp: 6, x: 0, z: 152 });
  g.x = 0;
  g.z = 154;
  g.yaw = Math.PI;
  g.combo = 0;
  g.strike();
  const light = b.stun;
  assert.equal(b.hp, 5);
  g.combo = 2;
  g.strike();
  assert.ok(b.stun > light * 2);
  assert.equal(b.hp, 4);
});
