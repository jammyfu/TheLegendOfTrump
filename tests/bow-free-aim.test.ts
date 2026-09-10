import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/game/simulation';
function setup() {
  const g = new Simulation(); g.start();
  g.weapon = 'bow'; g.bowUnlocked = true; g.arrows = 20;
  g.x = -20; g.z = 15;
  g.guards.forEach(e => { e.hp = 0; });
  return g;
}
test('hold draws without shooting; release shoots toward cursor once, independent of the locked enemy', () => {
  const g = setup();
  Object.assign(g.guards[0], { x: -20, z: 8, hp: 10 });
  g.lockedTarget = g.guards[0].id;
  g.aimPoint = { x: -10, y: 1.65, z: 15 };
  g.pressAttack();
  assert.equal(g.projectiles.length, 0);
  g.update(.05, { x: 0, z: 0, sprint: false });
  assert.ok(g.bowDraw > 0);
  g.releaseAttack();
  assert.equal(g.projectiles.length, 1);
  assert.ok(g.projectiles[0].vx > 0);
  assert.equal(g.projectiles[0].vz, 0);
  g.releaseAttack(); g.pressAttack();
  assert.equal(g.projectiles.length, 1); // cooldown still applies
  assert.equal(g.arrows, 19);
});
test('locked bow cursor remains independent and precision reduces sensitivity', () => {
  const g = setup(); g.lockedTarget = 0;
  const yaw = g.cameraYaw;
  g.look(40, 20);
  assert.ok(g.aimCursor.x > 0); assert.ok(g.aimCursor.y < 0);
  assert.equal(g.cameraYaw, yaw);
  const wide = g.aimCursor.x;
  g.aimCursor.x = 0; g.aiming = true; g.look(40, 0);
  assert.ok(g.aimCursor.x < wide);
});
test('arrow reticle stays inside its central aiming zone while the view takes over at its edge', () => {
  const g = setup();
  const yaw = g.cameraYaw;
  g.look(10_000, -10_000);
  assert.equal(g.aimCursor.x, 0.32);
  assert.equal(g.aimCursor.y, 0.24);
  assert.notEqual(g.cameraYaw, yaw, 'overflow pans the view instead of sending the reticle across the screen');
  g.aiming = true;
  g.aimCursor.x = 0;
  g.look(40, 0);
  assert.ok(g.aimCursor.x > 0 && g.aimCursor.x < 0.02, 'right-click precision uses a reduced cursor gain');
});
test('precision blocks walking, sprinting, jumping and mobile rolling until released', () => {
  const g = setup();
  const input = { x: 1, z: 0, sprint: true, guard: true };
  const x = g.x, z = g.z;
  g.update(.016, input);
  assert.equal(g.x, x); assert.equal(g.z, z); assert.equal(g.sprinting, false);
  g.jump(input); g.dodge(input, true);
  assert.equal(g.dodgeTime, 0); assert.equal(g.jumpBuffer, 0);
  g.update(.016, { ...input, guard: false });
  assert.notEqual(g.x, x);
});
test('horizontal shots do not receive elevation compensation, even at longer range', () => {
  for (const range of [10, 40]) {
    const g = setup();
    g.aimPoint = { x: g.x + range, y: g.y + 1.65, z: g.z };
    g.pressAttack();
    g.bowDraw = .85;
    g.releaseAttack();
    assert.equal(g.projectiles[0].vy, 0);
  }
});
test('arrow drop follows a parabola and is consistent at 30 and 120 fps', () => {
  const fly = (seconds: number, fps: number) => {
    const g = setup();
    g.y = 100; // unobstructed trajectory, above scene geometry
    g.aimPoint = { x: g.x + 50, y: 101.65, z: g.z };
    g.pressAttack();
    g.bowDraw = .85;
    g.releaseAttack();
    for (let i = 0; i < seconds * fps; i++) g['updateRanged'](1 / fps);
    const a = g.projectiles[0];
    assert.ok(a);
    assert.ok(Math.abs(a.x - (g.x + 34 * seconds)) < 1e-8);
    assert.ok(Math.abs(a.vy + 9.8 * seconds) < 1e-8);
    return 101.65 - a.y;
  };
  const near = fly(.5, 120), far = fly(1, 120);
  assert.ok(Math.abs(far - near * 4) < 1e-8);
  assert.ok(Math.abs(far - 4.9) < 1e-8);
  assert.ok(Math.abs(fly(1, 30) - far) < 1e-8);
});
