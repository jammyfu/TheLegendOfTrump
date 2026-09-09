import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation.ts";
const idle = { x: 0, z: 0, sprint: false, guard: false };
function enter() {
  const g = new Simulation();
  g.start();
  g.gems = 8;
  g.x = 0;
  g.z = -10.7;
  g.interact();
  return g;
}
function tick(g: Simulation, n: number, input = idle) {
  for (let t = 0; t < n; t += 1 / 60) g.update(1 / 60, input);
}
test("boss gates declaration, can be defeated by sword, and unlocks chapter end", () => {
  const g = enter();
  assert.equal(g.boss.active, true);
  g.x = 0;
  g.z = -17;
  g.interact();
  assert.equal(g.phase, "playing");
  // Exercise real damage, reach, recovery and final unlock independently of AI tactics.
  for (let i = 0; i < 18; i++) {
    g.boss.x = 0;
    g.boss.z = 0;
    g.boss.state = "recover";
    g.boss.timer = 5;
    g.x = 0;
    g.z = 2;
    g.yaw = Math.PI;
    g.stamina = 100;
    g.attack();
    tick(g, 0.95);
  }
  assert.equal(g.boss.hp, 0);
  g.x = 0;
  g.z = -17;
  g.interact();
  assert.equal(g.phase, "dialogue");
  g.interact();
  assert.equal(g.phase, "won");
});
test("boss sweep blocks directionally, heavy slam defeats block, dodge grants safety", () => {
  for (const mode of ["block", "slam", "dodge"]) {
    const g = enter();
    g.x = 0;
    g.z = 2;
    g.yaw = Math.PI;
    Object.assign(g.boss, {
      x: 0,
      z: 0,
      yaw: 0,
      state: "windup",
      move: mode === "slam" ? "slam" : "sweep",
      timer: 0.05,
    });
    if (mode === "dodge") g.dodge({ x: 1, z: 0, sprint: true });
    tick(g, 0.12, { ...idle, guard: true });
    assert.equal(g.hp, mode === "slam" ? 2 : 3, mode);
    if (mode === "block") assert.ok(g.stamina < g.maxStamina);
  }
});
test("shockwave can be jumped, hits once, enrage and retry reset work", () => {
  const g = enter();
  Object.assign(g.boss, {
    state: "recover",
    timer: 5,
    wave: 1.5,
    waveX: 0,
    waveZ: 0,
  });
  g.x = 0;
  g.z = 2;
  g.y = 1;
  g.vy = 0;
  g.grounded = false;
  tick(g, 0.15);
  assert.equal(g.hp, 3);
  g.y = 0;
  g.grounded = true;
  g.boss.wave = 1.5;
  tick(g, 0.15);
  assert.equal(g.hp, 2);
  tick(g, 0.5);
  assert.equal(g.hp, 2);
  g.boss.hp = 9;
  assert.equal(g.boss.enraged, true);
  g.phase = "lost";
  g.retry();
  assert.equal(g.zone, "office");
  assert.equal(g.hp, 3);
  assert.equal(g.boss.hp, 18);
  assert.equal(g.phase, "playing");
});

test("full boss AI can be beaten with guarding, evasion and recovery attacks", () => {
  const g = enter();
  for (let t = 0; t < 90 && g.boss.hp > 0 && g.hp > 0; t += 1 / 60) {
    const b = g.boss,
      dx = b.x - g.x,
      dz = b.z - g.z,
      d = Math.hypot(dx, dz),
      input = { ...idle };
    g.cameraYaw = 0;
    g.yaw = Math.atan2(dx, dz);
    if (b.state === "windup") {
      if (b.move === "sweep") input.guard = true;
      else if (b.move === "slam" && d < 3.7) {
        input.x = -dx / d;
        input.z = -dz / d;
        if (b.timer < 0.35) g.dodge({ ...input, sprint: true });
      } else if (b.move === "wave" && b.timer < 0.13) g.jump();
    } else if (b.state === "recover") {
      if (d > 2) {
        input.x = dx / d;
        input.z = dz / d;
      } else if (g.stamina >= 16) g.attack();
    }
    if (b.wave >= 0 && Math.abs(d - b.wave) < 1.2) g.jump();
    g.update(1 / 60, input);
  }
  assert.equal(g.boss.hp, 0);
  assert.ok(g.hp > 0);
  assert.ok(g.elapsed < 60);
});
