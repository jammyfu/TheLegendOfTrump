import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh, MeshStandardMaterial, BoxGeometry } from 'three';
import { Simulation } from '../src/game/simulation';
import { Boss } from '../src/game/boss';
import { enemyScale, ENEMY_RULES } from '../src/game/expedition';
import { GARDEN_HEDGE_HEIGHT } from '../src/game/world';
import { stabilizeFacadeMaterials } from '../src/game/facadeMaterials';
import { legendMaterial } from '../src/game/materials';
const idle = {x:0,z:0,sprint:false};
function fresh() { const g = new Simulation(); g.start(); g.swordUnlocked=g.shieldUnlocked=true; g.weapon='sword'; return g; }
test('garden hedge blocks jumping from outside; opened gate remains traversable',()=>{
 const g=fresh(); g.guards.forEach(e=>e.hp=0); g.x=-18;g.z=-5;g.cameraYaw=0;
 g.jump(); for(let i=0;i<90;i++)g.update(1/60,{...idle,x:1});
 assert.ok(g.x < -16, `jump crossed hedge: ${g.x}`);
 assert.equal(GARDEN_HEDGE_HEIGHT,3.6);
 assert.ok(g.colliders.filter(c=>c.id.startsWith('hedge-') && c.z===-5).every(c=>c.top===3.6));
 g.gateOpen=true; g.x=-13;g.z=3;g.y=0;g.grounded=true;g.cameraYaw=0;
 g.jump();
 for(let i=0;i<50;i++)g.update(1/60,{...idle,z:-1});
 assert.ok(g.z<0,`open gate blocked: ${g.z}`);
});
test('gate squad includes six mixed enemies and a captain with matching 150% collision scale',()=>{
 const g=fresh(); const squad=g.guards.filter(e=>Math.abs(e.x)<25&&Math.abs(e.z)<10);
 assert.equal(squad.length,6); assert.equal(new Set(squad.map(e=>e.kind)).size,3);
 const captain=g.guards.find(e=>e.sizeMultiplier===1.5)!;
 assert.equal(enemyScale(captain),ENEMY_RULES.brute.scale*1.5);
 assert.equal(g.colliders.find(c=>c.id===`guard-${captain.id}`)?.radius,.48*enemyScale(captain));
 g.x=0;g.z=5;assert.equal(g.enemyAttackBudget,3);g.z=100;assert.equal(g.enemyAttackBudget,2);
});
test('sword and spin hit multiple aligned enemies instead of first enemy shielding the group',()=>{
 for(const spin of [false,true]){
 const g=fresh();g.guards.forEach(e=>e.hp=0);g.x=0;g.z=145;g.yaw=0;
 for(let i=0;i<3;i++)Object.assign(g.guards[i],{hp:3,x:0,z:146+i*.55,stun:0});
 g.strike(spin);assert.deepEqual(g.guards.slice(0,3).map(e=>e.hp),spin?[1,1,1]:[2,2,2]);
 }
});
test('boss telegraphs darts for 1.1 seconds and snapshots aim, then alternates wave',()=>{
 const b=new Boss();b.reset();b.timer=0;b.x=0;b.z=0;
 assert.equal(b.update(.01,{x:0,z:12},[]),null);assert.equal(b.move,'dart');
 assert.equal(b.update(.5,{x:10,z:12},[]),null);assert.equal(b.aimX,0);
 assert.equal(b.update(.61,{x:10,z:12},[]),'dart');
 b.update(1.3,{x:0,z:12},[]);b.update(.31,{x:0,z:12},[]);assert.equal(b.move,'wave');
});
test('boss emits three finite spread darts; forward shield prevents damage',()=>{
 for(const guard of [false,true]){
 const g=fresh();g.zone='office';g.resetEncounter();g.boss.reset();g.x=0;g.z=10;g.yaw=Math.PI;
 Object.assign(g.boss,{x:0,z:0,state:'windup',move:'dart',timer:.01,aimX:0,aimZ:10,aimY:1.2});
 g.update(.02,{...idle,guard});assert.equal(g.projectiles.length,3);
 assert.ok(g.projectiles.every(p=>p.kind==='dart'&&p.owner===100));assert.ok(g.projectiles[0].vx<0&&g.projectiles[2].vx>0);
 for(let i=0;i<42;i++)g.update(1/60,{...idle,guard});
 assert.equal(g.hp,guard?3:2);
 }
});
test('facade correction clones shared glass once and preserves opaque depth occlusion',()=>{
 const glass=new MeshStandardMaterial();glass.name='City_Glass';const wall=new MeshStandardMaterial();
 const root=new Group();root.add(new Mesh(new BoxGeometry(),[glass,wall]),new Mesh(new BoxGeometry(),glass));
 const owned=stabilizeFacadeMaterials(root);assert.equal(owned.length,1);assert.equal(glass.polygonOffset,false);
 assert.equal(owned[0].polygonOffset,true);assert.ok(owned[0].depthTest&&owned[0].depthWrite);
 assert.equal((root.children[0] as Mesh).material instanceof Array,true);
 owned.forEach(m=>m.dispose());
});
test('all styled PBR materials receive a shared procedural normal map without mutating the GLB source',()=>{
 const source = new MeshStandardMaterial(); source.name = 'White_House_Stone';
 const stone = legendMaterial(source) as MeshStandardMaterial;
 const second = legendMaterial(source) as MeshStandardMaterial;
 assert.ok(stone.normalMap); assert.equal(stone.normalMap, second.normalMap);
 assert.equal(source.normalMap, null); assert.ok(stone.normalScale.x > 0);
 const steel = new MeshStandardMaterial(); steel.name = 'Sword_Steel';
 assert.ok((legendMaterial(steel) as MeshStandardMaterial).metalness > .7);
});
