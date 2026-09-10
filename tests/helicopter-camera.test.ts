import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/game/simulation';
import {cameraBoom,constrainCamera} from '../src/game/camera';
test('camera beside helicopter keeps a usable distance while looking toward the hull',()=>{
 const g=new Simulation();g.start();
 for(const yaw of [Math.PI/2-.02,Math.PI/2,Math.PI/2+.02]){
  const boom=cameraBoom(g.colliders,{x:5.71,y:1.9,z:183},yaw,.3,9.5);
  assert.ok(boom.distance>3,'do not collapse the camera into the hero');
  assert.ok(boom.direction.x<0,'camera should use the free side of the aircraft');
 }
});
test('door orbit remains safe after the final near-plane pass at every jump height',()=>{
 const g=new Simulation();g.start();const cs=g.colliders;
 const memory={yaw:null as number|null};
 for(const y of [0,.5,1,1.5,2,2.5,3])for(const z of [181.5,182,182.5,183]){
  for(let yaw=-Math.PI;yaw<Math.PI;yaw+=.2){
   const a={x:5.71,y:y+1.9,z};
   const b=cameraBoom(cs,a,yaw,.3,9.5,memory);
   const p=constrainCamera(cs,a,{x:a.x+b.direction.x*b.distance,y:a.y+b.direction.y*b.distance,z:a.z+b.direction.z*b.distance});
   assert.ok(Math.hypot(p.x-a.x,p.y-a.y,p.z-a.z)>3,`door/jump camera collapsed y=${y} z=${z} yaw=${yaw}`);
  }
 }
});
