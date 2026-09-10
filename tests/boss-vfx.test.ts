import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import sharp from 'sharp';
import { BOSS_VFX, slamBurst, slamRipple, hammerShake } from '../src/game/bossVfx';
import { createRippleGeometry, updateRippleGeometry } from '../src/game/rippleGeometry';
import { Simulation } from '../src/game/simulation';

test('generated boss textures preserve transparency and have a small runtime budget',async()=>{
  let bytes=0;
  for(const file of ['gpt-boss-ground-impact.webp','gpt-boss-water-ripple.webp','gpt-boss-telegraph.webp']){
    const path='public/textures/effects/'+file;
    const info=await sharp(path).metadata();
    assert.equal(info.width,512);assert.equal(info.height,512);assert.equal(info.hasAlpha,true);
    bytes+=(await stat(path)).size;
    const {data,info:raw}=await sharp(path).raw().toBuffer({resolveWithObject:true});
    assert.equal(data[3],0,'corner is transparent, not a rectangular black card');
    if(!file.includes('impact'))assert.equal(data[(256*raw.width+256)*4+3],0,'ring has an open center');
  }
  assert.ok(bytes<380*1024);
});
test('hammer shake is stronger up close, falls off with distance, and emphasizes direct hits',()=>{
  assert.equal(hammerShake(0),2.8);assert.equal(hammerShake(15),0);
  assert.ok(hammerShake(8)<hammerShake(3));
  for(const immune of [true,false]){
    const g=new Simulation();g.start();g.zone='office';g.boss.reset();
    Object.assign(g.boss,{x:0,z:0,yaw:0,move:'slam',state:'windup',timer:.01});
    g.x=g.boss.slamX;g.z=g.boss.slamZ;g.debug.invincible=immune;g.minions.forEach(e=>e.hp=0);
    g.update(.02,{x:0,z:0,sprint:false});
    assert.equal(g.impactStrength,immune?2.8:3.1);
  }
});
test('slam layers expand at staggered times, then all settle to invisible',()=>{
  assert.equal(slamRipple(.05,0).visible,true);
  assert.equal(slamRipple(.05,1).visible,false);
  assert.equal(slamRipple(.05,2).visible,false);
  for(let layer=0;layer<BOSS_VFX.layers;layer++){
    assert.ok(slamRipple(.5,layer).radius>slamRipple(.3,layer).radius);
    assert.equal(slamRipple(BOSS_VFX.duration,layer).visible,false);
    assert.equal(slamRipple(BOSS_VFX.duration,layer).opacity,0);
  }
  assert.ok(slamBurst(.01).flash>slamBurst(.1).flash);
  assert.equal(slamBurst(.2).flash,0);assert.equal(slamBurst(BOSS_VFX.duration).opacity,0);
});
test('water crest stays on the actual damage radius and updates the same geometry',()=>{
  const geometry=createRippleGeometry(),position=geometry.getAttribute('position');
  const buffer=position.array;
  for(const radius of [.2,8,35]){
    updateRippleGeometry(geometry,radius,1.2,.28,.4);
    for(let i=0;i<position.count;i++){
      const r=Math.hypot(position.getX(i),position.getY(i));
      assert.ok(r>=Math.max(.01,radius-.6)-1e-5&&r<=radius+.6+1e-5);
      assert.ok(position.getZ(i)>=-1e-6&&position.getZ(i)<=.28+1e-6);
    }
    assert.equal(position.array,buffer);
  }
  const before=position.getZ(70);updateRippleGeometry(geometry,35,1.2,.28,.7);
  assert.notEqual(position.getZ(70),before);
  geometry.dispose();
});
test('slam visual tail lasts long enough for ripples and clears without another hit',()=>{
  const g=new Simulation();g.start();g.zone='office';g.boss.reset();
  g.boss.move='slam';g.boss.state='windup';g.boss.timer=.01;
  g.x=12;g.z=12;g.minions.forEach(e=>e.hp=0);
  g.update(.03,{x:0,z:0,sprint:false});g.boss.active=false;
  for(let i=0;i<15;i++)g.update(.05,{x:0,z:0,sprint:false});
  assert.equal(g.effects.filter(e=>e.ground).length,1);assert.equal(g.hp,3);
  for(let i=0;i<9;i++)g.update(.05,{x:0,z:0,sprint:false});
  assert.equal(g.effects.filter(e=>e.ground).length,0);assert.equal(g.hp,3);
});
test('existing shockwave still hurts on the ground and can be jumped',()=>{
  for(const height of [0,1.1]){
    const g=new Simulation();g.start();g.zone='office';g.boss.reset();g.boss.active=false;
    g.boss.wave=6;g.boss.waveX=0;g.boss.waveZ=0;g.boss.x=0;g.boss.z=0;
    g.x=6.15;g.z=0;g.y=height;g.grounded=height===0;g.minions.forEach(e=>e.hp=0);
    g.update(.02,{x:0,z:0,sprint:false});
    assert.equal(g.hp,height===0?2:3);
  }
});
