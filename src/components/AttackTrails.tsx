import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Box3, BufferAttribute, BufferGeometry, DoubleSide, Matrix4, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';
import { game } from '../game/simulation';
import { ENEMY_RECOVERY } from '../game/enemyMotion';

const LENGTH = 10;
function makeTrail() {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array((LENGTH-1)*18),3));
  const mesh = new Mesh(geometry,new MeshBasicMaterial({color:'#ffe298',transparent:true,opacity:.65,side:DoubleSide,depthWrite:false,blending:AdditiveBlending,toneMapped:false}));
  mesh.frustumCulled=false;
  return {mesh, weapon:null as Object3D|null, key:'', points:[] as {a:Vector3;b:Vector3;t:number}[], a:new Vector3(),b:new Vector3()};
}
/** Sweep a ribbon between measured weapon endpoints; never invent a circular path. */
export function AttackTrails() {
  const trails=useMemo(()=>Array.from({length:16},makeTrail),[]);
  useEffect(()=>()=>trails.forEach(t=>{t.mesh.geometry.dispose();t.mesh.material.dispose();}),[trails]);
  useFrame(({scene})=>{
    const actors: {weapon:Object3D|null|undefined;key:string;color:string}[]=[];
    const elapsed=game.meleeSpec.duration-game.attackTime;
    if(game.phase==='playing' && game.weapon==='sword' && (game.spinTime>0 || game.attackTime>0 && elapsed>=game.meleeSpec.hit-.065 && elapsed<=game.meleeSpec.hit+.13))
      actors.push({weapon:scene.getObjectByName('EquippedSword'),key:`hero:${game.swordUpgraded}:${game.combo}:${game.airAttack}:${game.spinTime>0}`,color:game.spinTime>0?'#9af5ff':game.swordUpgraded?'#fff0a0':'#ffb84c'});
    if(game.phase==='playing')for(const g of game.activeGuards){
      if(g.hp<=0 || g.kind==='archer' || g.attackTime<=0 || ENEMY_RECOVERY[g.kind]-g.attackTime>.22 || Math.hypot(g.x-game.x,g.z-game.z)>25)continue;
      actors.push({weapon:scene.getObjectByName(`guard-${g.id}`)?.getObjectByName('SentinelWeapon'),key:`enemy:${g.id}`,color:'#ff5935'});
    }
    const boss=game.boss;
    if(game.phase==='playing' && game.zone==='office' && boss.hp>0 && boss.move!=='dart' &&
      (boss.state==='recover' && boss.recoveryDuration-boss.timer<.25 || boss.state==='windup' && boss.move==='slam' && boss.timer<.18))
      actors.push({weapon:scene.getObjectByName('guard-100')?.getObjectByName('BossWeapon'),key:`boss:${boss.sequence}`,color:'#ae89ff'});
    trails.forEach((trail,i)=>{
      const actor=actors[i]; const weapon=actor?.weapon;
      if(!weapon){trail.points.length=0;trail.mesh.visible=false;trail.key='';return;}
      weapon.updateWorldMatrix(true,true);
      if(trail.weapon!==weapon || trail.key!==actor.key){
        trail.weapon=weapon;trail.key=actor.key;trail.points.length=0;
        // Bounds in the weapon's own coordinates include only the equipped tier.
        const inverse=new Matrix4().copy(weapon.matrixWorld).invert(),bounds=new Box3(),p=new Vector3();
        weapon.traverseVisible(n=>{if(n instanceof Mesh){const position=n.geometry.getAttribute('position');for(let k=0;k<position.count;k++){p.fromBufferAttribute(position,k).applyMatrix4(n.matrixWorld).applyMatrix4(inverse);bounds.expandByPoint(p);}}});
        if(bounds.isEmpty())return;
        const size=bounds.getSize(new Vector3()),axis=size.y>=size.x&&size.y>=size.z?'y':size.x>=size.z?'x':'z';
        bounds.getCenter(trail.a);trail.b.copy(trail.a);
        trail.a[axis]=bounds.min[axis]+size[axis]*.3;trail.b[axis]=bounds.max[axis];
      }
      const a=trail.a.clone().applyMatrix4(weapon.matrixWorld),b=trail.b.clone().applyMatrix4(weapon.matrixWorld);
      const last=trail.points.at(-1);
      if(last && b.distanceTo(last.b)>4)trail.points.length=0;
      if(!last || a.distanceToSquared(last.a)+b.distanceToSquared(last.b)>.0001)trail.points.push({a,b,t:game.elapsed});
      while(trail.points.length>LENGTH || trail.points[0] && game.elapsed-trail.points[0].t>.1)trail.points.shift();
      const pos=trail.mesh.geometry.getAttribute('position');let cursor=0;
      for(let k=1;k<trail.points.length;k++){const previous=trail.points[k-1],current=trail.points[k];for(const v of [previous.a,previous.b,current.b,previous.a,current.b,current.a])pos.setXYZ(cursor++,v.x,v.y,v.z);}
      pos.needsUpdate=true;trail.mesh.geometry.setDrawRange(0,cursor);trail.mesh.visible=cursor>0;trail.mesh.material.color.set(actor.color);
    });
  });
  return <group name="measured-weapon-trails">{trails.map((t,i)=><primitive key={i} object={t.mesh}/>)}</group>;
}
