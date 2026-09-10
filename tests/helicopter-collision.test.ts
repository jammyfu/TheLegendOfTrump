import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/game/simulation';
import {occupied,moveAndSlide,lineClear} from '../src/game/collision';
import {LANDING} from '../src/game/expedition';
function colliders(){const g=new Simulation();g.start();return g.colliders;}
test('parked fuselage, nose, landing gear and low tail block the player',()=>{
 const cs=colliders();
 for(const [x,z] of [[8,183],[8,178.6],[5.9,184.65],[8,189]])
  assert.equal(occupied(cs,x,z,0,.38),true,`aircraft at ${x},${z}`);
 assert.equal(occupied(cs,LANDING.heroX,LANDING.heroZ,0,.38),false);
 assert.equal(occupied(cs,1,183,0,.38),false,'rotor sweep is not an invisible wall');
 assert.equal(occupied(cs,8,194,0,.38),false,'elevated tail leaves headroom');
});
test('running and rolling cannot tunnel through the parked fuselage',()=>{
 for(const speed of [9.5,14]){
  let p={x:2,y:0,z:183};const cs=colliders();
  for(let i=0;i<40;i++)p=moveAndSlide(cs,p.x,p.z,p.y,speed*.05,0,true);
  assert.ok(p.x<6,'must stop at the left cabin surface');
  assert.equal(occupied(cs,p.x,p.z,p.y,.38),false);
 }
});
test('parked hull blocks projectiles and stays out of the indoor collider list',()=>{
 assert.equal(lineClear(colliders(),{x:2,y:2,z:183},{x:14,y:2,z:183}),false);
 const g=new Simulation();g.start();g.zone='office';
 assert.equal(g.colliders.some(c=>c.id.startsWith('helicopter-')),false);
 g.beginIntro();g.skipIntro();assert.equal(occupied(g.colliders,g.x,g.z,g.y,.38),false);
});
