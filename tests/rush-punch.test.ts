import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/game/simulation';
const run={x:0,z:1,sprint:true};
function setup(){const g=new Simulation();g.start();g.zone='office';g.weapon='none';g.x=0;g.z=8;g.cameraYaw=0;g['lastInput']=run;return g;}
test('running barehand attack launches a punch and recovers without a combo index leak',()=>{
 const g=setup();g.pressAttack();assert.equal(g.rush,'punch');assert.equal(g.attackHeld,false);
 const z=g.z;for(let i=0;i<24;i++)g.update(.05,{x:0,z:0,sprint:false});
 assert.ok(g.z>z+2);assert.equal(g.rush,null);assert.ok(g.meleeSpec);
 g.pressAttack();assert.ok(g.attackTime>0);
});
test('rush punch hits once, weaker than wooden sword, with body impact feedback',()=>{
 const g=setup();g.zone='grounds';g.guards.forEach(e=>e.hp=0);
 Object.defineProperty(g,'colliders',{get:()=>[]});
 const enemy=g.guards[0];Object.assign(enemy,{hp:10,x:0,z:9.4,stun:100});
 g.pressAttack();g.rushTime=.35;g['rushContact']();const damage=10-enemy.hp;
 assert.ok(damage>0&&damage<.5);g['rushContact']();assert.equal(10-enemy.hp,damage);
 assert.ok(g.effects.some(e=>e.body&&!e.block&&e.meteor));assert.ok(g.hitStop>0);
});
test('walking and exhausted fists stay ordinary; rushing fists cannot hit through a wall',()=>{
 const g=setup();g['lastInput']={...run,sprint:false};g.pressAttack();assert.equal(g.rush,null);
 const tired=setup();tired.stamina=5;tired.pressAttack();assert.equal(tired.rush,null);
 const blocked=setup();blocked.zone='grounds';blocked.guards.forEach(e=>e.hp=0);
 Object.assign(blocked.guards[0],{hp:10,x:0,z:11,stun:100});
 Object.defineProperty(blocked,'colliders',{get:()=>[{id:'wall',zone:'grounds',x:0,z:9.2,w:20,d:.3,top:8}]});
 blocked.pressAttack();for(let i=0;i<20;i++)blocked.update(.05,run);
 assert.ok(blocked.z<8.68);assert.equal(blocked.guards[0].hp,10);
});
