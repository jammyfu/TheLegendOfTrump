import test from 'node:test';
import assert from 'node:assert/strict';
import { Boss } from '../src/game/boss';
import { occupied } from '../src/game/collision';

test('pursuit rolls once, eases into acceleration and has a cooldown even on failure',()=>{
  for(const roll of [.1,.9]){
    const b=new Boss();b.reset();Object.assign(b,{x:0,z:0,sequence:1,timer:0});
    let calls=0;const random=()=>{calls++;return roll;};
    b.update(.05,{x:0,z:30},[],random);
    assert.equal(b.boostTime>0,roll<.4);assert.equal(b.boostSpeed,1);
    for(let i=0;i<12;i++)b.update(.05,{x:0,z:30},[],random);
    assert.equal(calls,1);assert.ok(b.boostCooldown>5);
    assert.equal(b.boostSpeed>1,roll<.4);
    for(let i=0;i<20;i++)b.update(.05,{x:0,z:30},[],random);
    assert.equal(b.boostTime,0);
    b.reset();assert.equal(b.boostTime,0);assert.equal(b.boostCooldown,0);
  }
});
test('boost respects obstacles and ends before the hammer dodge window',()=>{
  const b=new Boss();b.reset();Object.assign(b,{x:0,z:0,sequence:1,timer:0});
  const wall={id:'wall',zone:'office' as const,x:0,z:3,w:30,d:.3,top:10};
  for(let i=0;i<65;i++){
    b.update(.05,{x:0,z:14},[wall],()=>0);
    assert.equal(occupied([wall],b.x,b.z,0,.8),false);
  }
  assert.equal(b.pursuingSlam,false);
  Object.assign(b,{pursuingSlam:true,pursuitTime:2,boostTime:1,state:'chase'});
  b.update(.05,{x:b.x,z:b.z+3},[],()=>0);
  assert.equal(b.state,'windup');assert.equal(b.boostTime,0);
});
