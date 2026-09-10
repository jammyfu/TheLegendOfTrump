import {useRef} from 'react';
import {useFrame,useLoader} from '@react-three/fiber';
import {AdditiveBlending,Group,Sprite,SpriteMaterial,TextureLoader,Vector3} from 'three';
import {game} from '../game/simulation';
import {rushPose} from '../game/rush';

/** Reuses the cached impact image. Four additive layers form a bright head,
 * stretched comet tail and satellite streaks, without full-screen flashes. */
export function MeteorEffects(){
 const root=useRef<Group>(null);
 const texture=useLoader(TextureLoader,import.meta.env.BASE_URL+'textures/effects/gpt-sword-impact.webp');
 const projected=useRef(new Vector3()),forward=useRef(new Vector3());
 useFrame(({camera})=>{
  root.current?.children.forEach((group,i)=>{
   const effect=game.effects[i-1];
   const rushing=i===0 && game.rush!==null && game.rush!=='shield' && rushPose(game.rush,game.rushTime).active;
   const hit=i>0 && effect && effect.source==='hero' && !effect.block && !effect.ground && effect.meteor && effect.age<.32;
   group.visible=game.phase==='playing'&&!!(rushing||hit);
   if(!group.visible)return;
   const yaw=rushing?game.yaw:effect.yaw??0;
   const t=rushing?0:effect.age/.32;
   const dx=Math.sin(yaw),dz=Math.cos(yaw);
   const x=rushing?game.x+dx*1.2:effect.x,z=rushing?game.z+dz*1.2:effect.z;
   const y=rushing?game.y+1.55:1.65;
   projected.current.set(x,y,z).project(camera);
   forward.current.set(x+dx,y,z+dz).project(camera).sub(projected.current);
   const angle=Math.atan2(forward.current.y,forward.current.x)-Math.PI/2;
   group.children.forEach((child,k)=>{
    const sprite=child as Sprite,mat=sprite.material as SpriteMaterial;
    const trail=k>0;
    const behind=trail?(k*.65+t*.65):0;
    sprite.position.set(x-dx*behind,y+(k===2?.18:0),z-dz*behind);
    const size=rushing?1:effect.heavy?1.4:1;
    sprite.scale.set((trail?.42:1.25)*size*(1+t), (trail?2.8:1.25)*size*(1+t*.6),1);
    mat.rotation=trail?angle:angle+t*2;
    mat.opacity=(1-t)**2*(trail?.24/k:.6);
    mat.color.set(k===0?'#fff7da':k===1?'#ffad53':'#ff683a');
   });
  });
 });
 return <group ref={root} name="meteor-composite-effects">
  {Array.from({length:9},(_,i)=><group key={i} visible={false}>
   {Array.from({length:4},(_,k)=><sprite key={k}>
    <spriteMaterial map={texture} blending={AdditiveBlending} transparent depthWrite={false} toneMapped={false}/>
   </sprite>)}
  </group>)}
 </group>;
}
