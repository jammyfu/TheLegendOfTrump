import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/game/simulation';
const run = { x:0, z:-1, sprint:true, guard:false };
function setup() {
  const g = new Simulation(); g.start();
  g.weapon='sword'; g.swordUnlocked=g.shieldUnlocked=true;
  g.x=-20; g.z=15; g.y=0; g.cameraYaw=0;
  g.guards.forEach(e=>{e.hp=0;});
  return g;
}
test('running attack starts thrust, costs stamina once and cannot stack other actions',()=>{
  const g=setup(); g.lastInput=run;
  const stamina=g.stamina;
  g.pressAttack(); assert.equal(g.rush,'thrust'); assert.equal(g.stamina,stamina-26);
  g.pressAttack(); g.attack(); g.jump(run); g.dodge(run,true); g.switchWeapon();
  assert.equal(g.stamina,stamina-26); assert.equal(g.attackTime,0); assert.equal(g.dodgeTime,0);
  assert.equal(g.weapon,'sword');
});
test('running guard edge starts shield rush, holding guard does not repeat it',()=>{
  const g=setup(); g.update(.016,{...run,guard:true});
  assert.equal(g.rush,'shield');
  const stamina=g.stamina;
  for(let i=0;i<24;i++)g.update(.05,{...run,guard:true});
  assert.equal(g.rush,null); assert.ok(g.stamina<stamina);
  assert.equal(g.guarding,true);
});
test('walking, bows, missing equipment and low stamina cannot trigger rush',()=>{
  const g=setup(); assert.equal(g.startRush('thrust',{...run,sprint:false}),false);
  g.weapon='bow'; assert.equal(g.startRush('shield',run),false);
  g.weapon='sword'; g.shieldUnlocked=false; assert.equal(g.startRush('shield',run),false);
  g.stamina=5; assert.equal(g.startRush('thrust',run),false);
});
test('rush cannot cross a wall or hit an enemy behind it',()=>{
  const g=setup();
  Object.assign(g.guards[0],{x:-20,z:11,hp:10,stun:100});
  Object.defineProperty(g,'colliders',{get:()=>[{id:'wall',zone:'grounds',x:-20,z:13,w:20,d:.5,bottom:0,top:8}]});
  g.startRush('thrust',run);
  for(let i=0;i<14;i++)g.update(.05,run);
  assert.ok(g.z>=13.6); assert.equal(g.guards[0].hp,10);
});
test('shield rush hits once per enemy and delivers more knockback than thrust',()=>{
  const hit=(kind:'shield'|'thrust')=>{
    const g=setup();
    Object.assign(g.guards[0],{x:-20,z:13.5,hp:10,stun:100});
    g.startRush(kind,run); g.rushTime=.45;
    g['rushContact'](); const hp=g.guards[0].hp;
    g['rushContact'](); assert.equal(g.guards[0].hp,hp);
    return Math.hypot(g.guards[0].knockX,g.guards[0].knockZ);
  };
  assert.ok(hit('shield')>hit('thrust'));
});
test('sideways sprint attacks the locked target, deliberate retreat overrides lock',()=>{
  for(const kind of ['thrust','shield'] as const){
    const g=setup();Object.assign(g.guards[0],{x:-20,z:10,hp:10});g.lockedTarget=g.guards[0].id;
    g.startRush(kind,{...run,x:1,z:0});
    assert.ok(Math.abs(Math.abs(g.yaw)-Math.PI)<1e-8);
    const retreat=setup();Object.assign(retreat.guards[0],{x:-20,z:10,hp:10});retreat.lockedTarget=retreat.guards[0].id;
    retreat.startRush(kind,{...run,z:1});assert.equal(retreat.yaw,0);
  }
});
test('sword flip cannot hit until the forward thrust phase',()=>{
  const g=setup();Object.assign(g.guards[0],{x:-20,z:13.5,hp:10,stun:100});
  g.startRush('thrust',run);g.rushTime=.7;g['rushContact']();assert.equal(g.guards[0].hp,10);
  g.rushTime=.45;g['rushContact']();assert.ok(g.guards[0].hp<10);
});
test('shield impact rebounds away from the target once, even while forward is held',()=>{
  const g=setup();
  Object.assign(g.guards[0],{x:-20,z:13.5,hp:10,stun:100});
  g.startRush('shield',run);g.rushTime=.45;g['rushContact']();
  assert.equal(g.rushRebounding,true);
  const contactZ=g.z, hp=g.guards[0].hp, stamina=g.stamina;
  g.hitStop=0;
  for(let i=0;i<5;i++)g.update(.05,{...run,guard:true});
  assert.ok(g.z>contactZ+.35,'impact must physically separate the hero from the target');
  assert.ok(g.z<contactZ+1,'rebound stays short');
  assert.equal(g.guards[0].hp,hp);assert.ok(g.stamina<stamina);
  for(let i=0;i<5;i++)g.update(.05,{x:0,z:0,sprint:false,guard:true});
  assert.equal(g.rush,null);assert.equal(g.rushRebounding,false);assert.equal(g.guarding,true);
});
test('a shield rush bounces off a wall without hitting enemies through it',()=>{
  const g=setup();
  Object.assign(g.guards[0],{x:-20,z:11,hp:10,stun:100});
  Object.defineProperty(g,'colliders',{get:()=>[{id:'wall',zone:'grounds',x:-20,z:13,w:20,d:.5,bottom:0,top:8}]});
  g.startRush('shield',run);
  for(let i=0;i<10&&!g.rushRebounding;i++)g.update(.025,run);
  assert.equal(g.rushRebounding,true);
  const contactZ=g.z;g.hitStop=0;
  for(let i=0;i<5;i++)g.update(.05,run);
  assert.ok(g.z>contactZ+.35);assert.ok(g.z>=13.6);assert.equal(g.guards[0].hp,10);
});
test('rebound respects a wall behind the player and is cleared by cancellation/restart',()=>{
  const g=setup();
  Object.assign(g.guards[0],{x:-20,z:13.5,hp:10,stun:100});
  Object.defineProperty(g,'colliders',{get:()=>[{id:'rear-wall',zone:'grounds',x:-20,z:16,w:20,d:.5,bottom:0,top:8}]});
  g.startRush('shield',run);g.rushTime=.45;g['rushContact']();g.hitStop=0;
  for(let i=0;i<5;i++)g.update(.05,run);
  assert.ok(g.z<15.38);assert.equal(g.rushRebounding,true);
  g['cancelCombo']();assert.equal(g.rushRebounding,false);assert.equal(g.rush,null);
  g.rushRebounding=true;g.start();assert.equal(g.rushRebounding,false);
});
test('missing a shield rush does not recoil and sword thrust keeps its forward travel',()=>{
  const g=setup();g.startRush('shield',run);
  for(let i=0;i<12;i++){g.update(.05,run);assert.equal(g.rushRebounding,false);}
  assert.ok(g.z<12);
  const sword=setup();Object.assign(sword.guards[0],{x:-20,z:13.5,hp:10,stun:100});
  sword.startRush('thrust',run);sword.rushTime=.45;sword['rushContact']();
  assert.equal(sword.rushRebounding,false);assert.ok(sword.guards[0].hp<10);
});
test('thrust threshold is strict and low stamina falls back to an ordinary sword attack',()=>{
  for(const stamina of [59,60,61]) {
    const g=setup();g.lastInput=run;g.stamina=stamina;g.pressAttack();
    if(stamina>60){assert.equal(g.rush,'thrust');assert.equal(g.stamina,stamina-26);}
    else {assert.equal(g.rush,null);assert.ok(g.attackTime>0);assert.equal(g.stamina,stamina-8);}
  }
});
test('shield threshold is strict and low stamina retains ordinary held guard',()=>{
  for(const stamina of [1,69,70,71]) {
    const g=setup();g.stamina=stamina;g.update(0,{...run,guard:true});
    assert.equal(g.guarding,true);
    if(stamina>70){assert.equal(g.rush,'shield');assert.equal(g.stamina,stamina-30);}
    else {assert.equal(g.rush,null);assert.equal(g.stamina,stamina);assert.equal(g.cooldown,0);}
  }
});
