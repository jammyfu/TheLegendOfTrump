import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
const idle = { x: 0, z: 0, sprint: false };
function fresh() { const g = new Simulation(); g.start(); return g; }
test("jump works without stamina and buffers a press just before landing", () => {
 const g = fresh(); g.stamina = 0; g.jump(); assert.ok(g.vy > 0);
 g.y = 0.04; g.vy = -3; g.grounded = false; g.coyoteTime = 0;
 g.jump(); assert.equal(g.vy, -3); g.update(1/60, idle);
 assert.ok(g.vy > 0); assert.equal(g.jumpBuffer, 0);
 const v = g.vy; g.jump(); assert.equal(g.vy, v);
});
test("ledge grace is consumed once and roll does not allow an early jump", () => {
 const g = fresh(); g.grounded = false; g.coyoteTime = 0.08; g.jump();
 assert.ok(g.vy > 0); assert.equal(g.coyoteTime, 0);
 const h = fresh(); h.dodge(); h.jump(); h.update(1/60, idle); assert.equal(h.grounded, true);
});
test("mouse motion preserves lock and Boss can be locked", () => {
 const g = fresh(); g.zone = "office"; g.boss.reset(); g.x = 0; g.z = 6;
 g.toggleLock(); assert.equal(g.lockedTarget, 100);
 g.look(100, 10); assert.equal(g.lockedTarget, 100);
 g.toggleLock(); assert.equal(g.lockedTarget, null);
});
test("held guard persists and resumes after a roll", () => {
 const g = fresh(); const guard = {...idle, guard:true};
 for(let i=0;i<60;i++) { g.update(1/60, guard); assert.equal(g.guarding,true); }
 g.dodge(); assert.equal(g.guarding,false);
 for(let i=0;i<30;i++) g.update(1/60, guard);
 assert.equal(g.guarding,true); g.update(1/60,idle); assert.equal(g.guarding,false);
});
test("defense cancels swing recovery but preserves its active strike", () => {
 const g = fresh(); g.attack(); g.update(0.05,{...idle,guard:true});
 assert.ok(g.attackTime > 0);
 for(let i=0;i<15;i++) g.update(1/60,{...idle,guard:true});
 assert.equal(g.guarding,true); assert.equal(g.attackTime,0);
});
