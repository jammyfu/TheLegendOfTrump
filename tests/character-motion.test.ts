import test from "node:test";
import assert from "node:assert/strict";
import { locomotionPose, rollPose } from "../src/game/characterMotion";
import { enemyAttackPose, ENEMY_RECOVERY } from "../src/game/enemyMotion";

test("run gait counter-swings limbs, bends only the recovering knee and leans forward", () => {
  const pose = locomotionPose(Math.PI / (2 * 14.5), true, true);
  assert.ok(pose.leftLeg > 0.65);
  assert.ok(pose.rightLeg < -0.65);
  assert.ok(pose.leftArm < 0 && pose.rightArm > 0);
  assert.equal(pose.leftKnee, 0);
  assert.ok(pose.rightKnee > 1);
  assert.ok(pose.waist[0] > 0.1);
});

test("roll rotates the complete body around its pelvis and tucks at mid-flight", () => {
  const start = rollPose(0.55);
  const middle = rollPose(0.275);
  const finish = rollPose(0);
  assert.equal(start.rootPitch, 0);
  assert.ok(Math.abs(middle.rootPitch - Math.PI) < 1e-8);
  assert.ok(middle.leftKnee > start.leftKnee + 0.9);
  assert.ok(middle.headPitch < -0.2);
  assert.ok(Math.abs(finish.rootPitch - Math.PI * 2) < 1e-8);
});

test("enemy melee and ranged attacks have anticipation and follow-through poses", () => {
  const swordReady = enemyAttackPose("sentinel", 0.65, 0.65, 0);
  const swordImpact = enemyAttackPose(
    "sentinel",
    0,
    0.65,
    ENEMY_RECOVERY.sentinel,
  );
  const swordFollow = enemyAttackPose(
    "sentinel",
    0,
    0.65,
    ENEMY_RECOVERY.sentinel - 0.12,
  );
  const beforeHit = enemyAttackPose("sentinel", 0.00001, 0.65, 0);
  assert.ok(
    Math.abs(beforeHit.rightArm[0] - swordImpact.rightArm[0]) < 0.001,
    "damage must occur at the end of the visible stroke, without a pose jump",
  );
  assert.ok(swordImpact.rightArm[0] < swordReady.rightArm[0] - 0.8);
  assert.ok(swordFollow.rightArm[0] > swordImpact.rightArm[0]);
  assert.ok(swordFollow.torso[1] > 0);

  const draw = enemyAttackPose("archer", 0.001, 0.95, 0);
  assert.ok(draw.leftArm[0] < -1.4);
  assert.ok(draw.rightElbow[0] < -1.2);
});
