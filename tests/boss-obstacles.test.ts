import test from 'node:test';
import assert from 'node:assert/strict';
import { Boss } from '../src/game/boss';
import { Simulation } from '../src/game/simulation';
import { occupied } from '../src/game/collision';
import { Box3,BoxGeometry,Mesh,MeshBasicMaterial,Vector3 } from 'three';
import { meshObscuresActor } from '../src/game/occlusion';
import { cameraObstacles } from '../src/game/camera';

test('boss escapes contact with desk and chair instead of having no outgoing route',()=>{
  const g=new Simulation();g.start();g.zone='office';
  const obstacles=g.colliders.filter(c=>!c.id.startsWith('guard-'));
  for(const [z,targetZ] of [[-17.02,-27],[-25.202,-14]]){
    const b=new Boss();b.reset();Object.assign(b,{x:0,z,timer:0});
    let attacked=false;
    for(let i=0;i<400;i++){
      const attack=b.update(.05,{x:0,z:targetZ},obstacles,()=>1);
      attacked ||= attack!==null;
      assert.equal(occupied(obstacles,b.x,b.z,0,1.6),false);
    }
    assert.ok(attacked,'must detour from touching furniture and resume attacks');
  }
});

test('boss goes around the actual office sofa instead of pushing against it',()=>{
  const g=new Simulation();g.start();g.zone='office';
  const obstacles=g.colliders.filter(c=>!c.id.startsWith('guard-'));
  const b=new Boss();b.reset();Object.assign(b,{x:29,z:4.1,sequence:1,timer:0});
  const target={x:19,z:4.1};let reached=false,detour=false;
  for(let i=0;i<240;i++){
    b.update(.05,target,obstacles,()=>0);
    assert.equal(occupied(obstacles,b.x,b.z,0,.8),false);
    detour ||= Math.abs(b.z-4.1)>4;
    if(Math.hypot(b.x-target.x,b.z-target.z)<4){reached=true;break;}
  }
  assert.ok(detour);assert.ok(reached);
});

test('ground wave hits through furniture without boss sight, once; jump and god mode remain safe',()=>{
  for(const mode of ['ground','jump','god'] as const){
    const g=new Simulation();g.start();g.zone='office';g.boss.reset();g.boss.active=false;
    Object.assign(g.boss,{x:0,z:-25,waveX:0,waveZ:-25,wave:8.9,waveHit:false});
    Object.assign(g,{x:0,z:-16,y:mode==='jump'?1.1:0,grounded:mode!=='jump',invincible:0});
    g.debug.invincible=mode==='god';
    assert.equal(g.visible(g.boss.x,g.boss.z,'guard-100'),false);
    g.update(.01,{x:0,z:0,sprint:false});
    assert.equal(g.hp,mode==='ground'?2:3);
    g.invincible=0;g.update(.01,{x:0,z:0,sprint:false});
    assert.equal(g.hp,mode==='ground'?2:3);
  }
});

test('a swept wave catches a fast frame crossing rather than skipping the player',()=>{
  const g=new Simulation();g.start();g.zone='office';g.boss.reset();
  Object.assign(g.boss,{x:0,z:0,waveX:0,waveZ:0,wave:4,state:'recover',timer:5});
  Object.assign(g,{x:0,z:5,y:0,invincible:0});g.debug.invincible=false;
  // Boss test simulates a coarse step directly; simulation clamps frame duration.
  const update=g.boss.update.bind(g.boss);
  g.boss.update=()=>update(.3,g,[]);
  g.update(.01,{x:0,z:0,sprint:false});
  assert.equal(g.hp,2);
});

test('desk fading catches lower-body obstruction even when the head ray is clear',()=>{
  const mesh=new Mesh(new BoxGeometry(3,1.3,.4),new MeshBasicMaterial());
  mesh.position.set(0,.65,2);mesh.updateMatrixWorld(true);
  const bounds=new Box3().setFromObject(mesh);
  assert.equal(meshObscuresActor(mesh,bounds,new Vector3(0,1,5),{x:0,y:0,z:0}),true);
  assert.equal(meshObscuresActor(mesh,bounds,new Vector3(8,3,5),{x:0,y:0,z:0}),false);
  mesh.geometry.dispose();mesh.material.dispose();
});

test('desk and chair retain actor collisions but do not collapse the camera boom',()=>{
  const g=new Simulation();g.start();g.zone='office';
  const physical=g.colliders, camera=cameraObstacles(physical);
  for(const id of ['desk','chair']){
    assert.ok(physical.some(c=>c.id===id));assert.ok(!camera.some(c=>c.id===id));
  }
  assert.ok(camera.some(c=>c.id.startsWith('bookcase')));
});
