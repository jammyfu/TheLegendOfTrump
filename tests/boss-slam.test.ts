import test from 'node:test';
import assert from 'node:assert/strict';
import { Boss } from '../src/game/boss';
import { BOSS_SLAM, hammerContactAngles } from '../src/game/bossHammer';
import { Simulation } from '../src/game/simulation';
import { occupied } from '../src/game/collision';
const idle = { x: 0, z: 0, sprint: false };

test('boss closes distance for a hammer attack, then commits its telegraphed landing point', () => {
  const boss = new Boss(); boss.reset();
  boss.sequence = 1; boss.timer = 0; boss.x = boss.z = 0;
  const target = { x: 0, z: 14 };
  boss.update(.05, target, []);
  assert.ok(boss.pursuingSlam && boss.z > 0);
  for (let i = 0; i < 60 && boss.state === 'chase'; i++) boss.update(.05, target, []);
  assert.equal(boss.state, 'windup'); assert.equal(boss.move, 'slam');
  assert.ok(Math.hypot(boss.x-target.x, boss.z-target.z) <= 4);
  boss.timer = BOSS_SLAM.commit;
  const landing = [boss.slamX, boss.slamZ];
  const position = [boss.x, boss.z];
  boss.update(.05, { x: 10, z: 12 }, []);
  assert.deepEqual([boss.slamX, boss.slamZ], landing);
  assert.deepEqual([boss.x, boss.z], position);
  boss.timer = .01;
  assert.equal(boss.update(.02, target, []), 'slam');
  assert.equal(boss.update(.02, target, []), null);
});

test('hammer pursuit obeys a wall and times out instead of teleporting or endlessly charging', () => {
  const boss = new Boss(); boss.reset(); boss.sequence = 1; boss.timer = 0;
  boss.x = boss.z = 0;
  const wall = { id: 'wall', zone: 'office' as const, x: 0, z: 3, w: 30, d: .3, top: 10 };
  for (let i = 0; i < 65; i++) {
    const previous={x:boss.x,z:boss.z};
    boss.update(.05, { x: 0, z: 14 }, [wall]);
    assert.equal(occupied([wall],boss.x,boss.z,0,.8),false);
    assert.ok(Math.hypot(boss.x-previous.x,boss.z-previous.z)<.7);
  }
  assert.equal(boss.pursuingSlam, false);
});

function contact(evade = false) {
  const g = new Simulation(); g.start(); g.zone = 'office';
  g.boss.reset(); g.boss.x = 0; g.boss.z = 0; g.boss.yaw = 0;
  g.boss.move = 'slam'; g.boss.state = 'windup'; g.boss.timer = .01;
  g.x = g.boss.slamX; g.z = g.boss.slamZ; g.invincible = evade ? .3 : 0;
  g.swordUnlocked = g.shieldUnlocked = g.bowUnlocked = true; g.weapon = 'bow'; g.arrows = 20;
  g.pressAttack();
  g.update(.02, { ...idle, guard: true });
  return g;
}
test('hammer contact cancels the draw, stuns briefly and protects recovery, without duplicate damage', () => {
  const g = contact();
  assert.equal(g.hp, 2); assert.equal(g.stunTime, BOSS_SLAM.stun);
  assert.equal(g.attackHeld, false); assert.equal(g.aiming, false);
  const pos = [g.x, g.z];
  g.pressAttack(); g.jump(); g.dodge({x:1,z:0,sprint:true}, true); g.releaseAttack();
  assert.equal(g.projectiles.length, 0); assert.equal(g.arrows, 20);
  assert.equal(g.jumpBuffer, 0); assert.equal(g.dodgeTime, 0);
  assert.equal(g.canMobileAttack, false); assert.equal(g.canMobileGuard, false);
  for (let i=0;i<10;i++) g.update(.05,{x:1,z:0,sprint:true,guard:true});
  assert.deepEqual([g.x,g.z],pos); assert.equal(g.hp,2);
  g.boss.active = false;
  for (let i=0;i<20;i++) g.update(.05,idle);
  assert.equal(g.stunTime,0); assert.equal(g.hp,2);
  g.update(.05,{x:1,z:0,sprint:false}); assert.notEqual(g.x,pos[0]);
  g.stunTime=.5;g.retry();assert.equal(g.stunTime,0);
});
test('a dodge avoids stun while the missed hammer still fractures its actual landing point', () => {
  const g = contact(true);
  assert.equal(g.hp,3);assert.equal(g.stunTime,0);
  const burst=g.effects.find(e=>e.ground)!;
  assert.deepEqual([burst.x,burst.z],[g.boss.slamX,g.boss.slamZ]);
  assert.equal(g.events.filter(e=>e==='slam').length,1);
});
test('hammer joint solve reaches the ground target with its head, not an airborne damage proxy', () => {
  const y=-1.55,z=1.03;
  const {shoulder,elbow}=hammerContactAngles(y,z);
  const angle=shoulder+elbow;
  assert.ok(Math.abs(-.52*Math.cos(shoulder)-1.83*Math.cos(angle)-.18*Math.sin(angle)-y)<1e-6);
  assert.ok(Math.abs(-.52*Math.sin(shoulder)-1.83*Math.sin(angle)+.18*Math.cos(angle)-z)<1e-6);
});
