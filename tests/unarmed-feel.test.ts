import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
import { UNARMED, unarmedPose } from "../src/game/unarmed";
const idle = { x: 0, z: 0, sprint: false };
function setup(stage = 0, hit = true) {
  const g = new Simulation();
  g.start();
  g.weapon = "none";
  g.x = -20;
  g.z = 15;
  g.yaw = 0;
  g.guards.forEach((e) => (e.hp = 0));
  if (hit)
    Object.assign(g.guards[0], {
      hp: 3,
      x: g.x,
      z: g.z + 1.2,
      stun: 10,
      stunDuration: 10,
    });
  g.events = [];
  if (stage > 0) {
    g.combo = stage - 1;
    g.comboWindow = 1;
  }
  g.attack();
  return g;
}
test("unarmed contact peaks match damage time and winding shoulders recover", () => {
  for (let stage = 0; stage < 3; stage++) {
    const spec = UNARMED[stage],
      peak = unarmedPose(stage, spec.hit);
    assert.equal(peak.strike, 1);
    assert.equal(unarmedPose(stage, 0).strike, 0);
    assert.equal(unarmedPose(stage, spec.duration).strike, 0);
    if (stage < 2) {
      assert.ok(Math.abs(peak.waistYaw) >= 0.45);
      assert.ok(peak.shoulder < -1.6);
      assert.ok(peak.elbow > -0.1);
    }
  }
});
test("each stage deals low damage once, with graduated contact stop and body effects", () => {
  for (let stage = 0; stage < 3; stage++) {
    const g = setup(stage);
    const spec = UNARMED[stage];
    while (g.hitPending) g.update(0.01, idle);
    assert.equal(g.guards[0].hp, 3 - spec.damage);
    assert.equal(g.hitStop, spec.stop);
    assert.equal(g.impactStrength, spec.impact);
    assert.equal(g.attackTime, spec.duration - spec.hit);
    assert.ok(g.effects[0].body);
    assert.ok(g.events.includes(stage === 2 ? "kickHit" : "punchHit"));
    for (let i = 0; i < 90; i++) g.update(0.01, idle);
    assert.equal(g.guards[0].hp, 3 - spec.damage);
    assert.equal(g.hitStop, 0);
  }
});
test("hit-stop accepts one queued press and hit-confirm chains earlier than a miss", () => {
  const g = setup();
  while (g.hitPending) g.update(0.01, idle);
  const time = g.attackTime;
  g.pressAttack();
  g.releaseAttack();
  g.attack();
  assert.ok(g.comboQueued);
  g.update(0.01, idle);
  assert.equal(g.attackTime, time);
  for (let i = 0; i < 70 && g.combo === 0; i++) g.update(0.01, idle);
  assert.equal(g.combo, 1);
  const miss = setup(0, false);
  for (let i = 0; i < 8; i++) miss.update(0.01, idle);
  miss.attack();
  for (let i = 0; i < 19; i++) miss.update(0.01, idle);
  assert.equal(miss.combo, 0);
  assert.equal(miss.hitStop, 0);
  assert.equal(miss.effects.length, 0);
  assert.deepEqual(
    miss.events.filter((e) => e === "fistSwing"),
    ["fistSwing"],
  );
});
test("unarmed facing cone cannot hit someone beside the player", () => {
  const g = setup();
  g.guards[0].x = g.x + 1.3;
  g.guards[0].z = g.z;
  g.strike();
  assert.equal(g.guards[0].hp, 3);
  assert.equal(g.hitStop, 0);
});
test("a full fist charge leans back, drains stamina, and releases a heavy punch", () => {
  const g = setup();
  g.pressAttack();
  // Freeze the target after the opening jab so a counterattack cannot
  // interrupt the held-input scenario being verified here.
  while (g.hitPending) g.update(0.01, idle);
  Object.assign(g.guards[0], { stun: 10, stunDuration: 10, cooldown: 10 });
  for (let i = 0; i < 24; i++) g.update(0.05, idle);
  assert.ok(g.chargeTime >= 0.65, "a held fist should reach its full charge");
  const staminaAtFullCharge = g.stamina;
  for (let i = 0; i < 10; i++) g.update(0.05, idle);
  assert.ok(g.stamina < staminaAtFullCharge, "holding a full charge should spend stamina");
  g.releaseAttack();
  while (g.hitPending) g.update(0.01, idle);
  assert.equal(g.guards[0].hp, 1.5, "the normal jab plus heavy punch should deal 1.5 damage");

  let pose: ReturnType<typeof unarmedPose> | undefined;
  try {
    pose = unarmedPose(3, 0.65);
  } catch {
    // The assertion below documents the required heavy-punch pose contract.
  }
  assert.ok(pose, "a heavy-punch charge pose should exist");
  assert.ok(pose.waistPitch < -0.35, "full charge must visibly lean the torso back");
  assert.ok(pose.shoulder < -1.25, "punching arm must draw behind the body");
});

test('long-held fist release completes recovery and permits moving and attacking again',()=>{
  const g=setup(0,false);
  g.zone='office';g.x=0;g.z=12;
  for(let cycle=0;cycle<3;cycle++){
    g.stamina=g.maxStamina;g.pressAttack();
    for(let i=0;i<80;i++)g.update(.05,idle);
    assert.ok(g.chargeTime>=.65);
    g.releaseAttack();assert.equal(g.heavyPunch,true);
    for(let i=0;i<60;i++)g.update(.05,idle);
    assert.equal(g.heavyPunch,false);assert.equal(g.attackTime,0);
    assert.equal(g.combo,0);assert.ok(g.meleeSpec);
    const x=g.x;g.update(.05,{...idle,x:1});assert.notEqual(g.x,x);
    g.pressAttack();g.releaseAttack();assert.ok(g.attackTime>0);
    for(let i=0;i<30;i++)g.update(.05,idle);
  }
});

test('interrupting a released heavy punch clears its special combo index',()=>{
  const g=setup(0,false);
  g.pressAttack();for(let i=0;i<60;i++)g.update(.05,idle);
  g.releaseAttack();assert.equal(g.heavyPunch,true);
  g.stunFromHammer();
  assert.equal(g.combo,0);assert.ok(g.meleeSpec);
  for(let i=0;i<50;i++)g.update(.05,idle);
});
