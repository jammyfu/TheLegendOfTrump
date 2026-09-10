import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/game/simulation';
import { interactions } from '../src/game/world';
const idle = {x:0,z:0,sprint:false};
function acquire(g: Simulation) {
  g.start();
  const chest = interactions.find(i=>i.id==='chest-wood-sword')!;
  g.x=chest.x; g.z=chest.z+2;
  g.interact();
}
test('equipment gets one short presentation, then returns control', () => {
  const g=new Simulation(); acquire(g);
  assert.equal(g.phase,'obtaining');
  assert.ok(g.swordUnlocked);
  assert.equal(g.events.filter(e=>e==='itemReveal').length,1);
  for(let i=0;i<34;i++)g.update(.05,idle);
  assert.equal(g.phase,'playing');
});
test('pickup presentation freezes damage and movement and respects pause', () => {
  const g=new Simulation(); acquire(g);
  const x=g.x, hp=g.hp;
  g.update(.05,{x:1,z:1,sprint:true});
  assert.equal(g.x,x); assert.equal(g.hp,hp);
  g.pause();
  for(let i=0;i<40;i++)g.update(.05,idle);
  assert.equal(g.phase,'paused');
  g.pause(); assert.equal(g.phase,'obtaining');
  g.start(); assert.equal(g.pickupTime,0);
});
test('ordinary sword hits recover promptly while preserving impact feedback', () => {
  const g=new Simulation();g.start();g.swordUnlocked=true;g.weapon='sword';
  const enemy=g.guards[0];g.x=enemy.x;g.z=enemy.z+1.2;g.yaw=Math.PI;
  g.strike();
  assert.ok(enemy.stun<=.3 && enemy.stun>0);
  assert.ok(enemy.cooldown<=.4);
  assert.ok(g.hitStop>0);
});
