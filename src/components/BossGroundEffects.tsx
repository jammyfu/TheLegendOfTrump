import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, Group, LoadingManager, Mesh, MeshBasicMaterial,
  SRGBColorSpace, Sprite, Texture, TextureLoader } from 'three';
import { game } from '../game/simulation';
import { BOSS_VFX, slamBurst, slamRipple } from '../game/bossVfx';
import { BOSS_SLAM } from '../game/bossHammer';
import { createRippleGeometry, updateRippleGeometry } from '../game/rippleGeometry';
import { colorEnergyBand, createWarningSegments } from '../game/energyGeometry';

function Ripple({texture}:{texture:Texture|null}){
  const geometry=useMemo(createRippleGeometry,[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} rotation={[-Math.PI/2,0,0]}>
    <meshBasicMaterial map={texture} color={texture?'#ffffff':'#7fdbed'}
      side={DoubleSide} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false}/>
  </mesh>;
}

function GroundCrest(){
  const geometry=useMemo(()=>colorEnergyBand(createRippleGeometry(),'#42cfff'),[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh name="boss-raised-ground-wave" geometry={geometry} rotation={[-Math.PI/2,0,0]}>
    <meshBasicMaterial vertexColors transparent opacity={.32} blending={AdditiveBlending}
      depthWrite={false} toneMapped={false} side={DoubleSide}/>
  </mesh>;
}

export function BossGroundEffects(){
  const bursts=useRef<Group>(null),wave=useRef<Group>(null),warning=useRef<Group>(null);
  const boost=useRef<Mesh>(null);
  const windup=useRef({move:'',previous:0,duration:1});
  const segments=useMemo(createWarningSegments,[]);
  useEffect(()=>()=>segments.dispose(),[segments]);
  const [maps,setMaps]=useState<{impact:Texture|null;ripple:Texture|null}>({impact:null,ripple:null});
  const [reducedMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)'));
  useEffect(()=>{
    let live=true;
    const owned:Texture[]=[];
    // Optional art never enters the startup LoadingManager or a Suspense gate.
    // Simple geometry remains usable if either download is slow or unavailable.
    const loader=new TextureLoader(new LoadingManager());
    const timer=window.setTimeout(()=>{
      for(const [key,file] of [['impact','gpt-boss-ground-impact.webp'],['ripple','gpt-boss-water-ripple.webp']] as const){
        const texture=loader.load(import.meta.env.BASE_URL+'textures/effects/'+file,loaded=>{
          if(!live){loaded.dispose();return;}
          loaded.colorSpace=SRGBColorSpace;
          setMaps(previous=>({...previous,[key]:loaded}));
        },undefined,()=>{/* Keep the geometry fallback; no gameplay dependency. */});
        owned.push(texture);
      }
    },200);
    return ()=>{live=false;window.clearTimeout(timer);owned.forEach(t=>t.dispose());};
  },[]);
  useFrame(()=>{
    const soften=reducedMotion.matches?.6:1;
    const boss=game.boss;
    if(boost.current){
      boost.current.visible=game.zone==='office'&&boss.hp>0&&boss.state==='chase'&&boss.boostTime>0;
      boost.current.position.set(boss.x,.25,boss.z);
      boost.current.scale.setScalar(1.1+(boss.boostSpeed-1)*.4);
      (boost.current.material as MeshBasicMaterial).opacity=.65*soften;
    }
    if(warning.current){
      const root=warning.current;
      root.visible=game.zone==='office'&&boss.hp>0&&boss.state==='windup';
      if(root.visible){
        const previous=windup.current;
        if(previous.move!==boss.move||boss.timer>previous.previous||previous.previous===0){
          previous.duration=boss.move==='slam'?(boss.enraged?BOSS_SLAM.enragedWindup:BOSS_SLAM.windup)
            :Math.max(boss.timer,boss.move==='wave'?1.25:boss.move==='dart'?1.1:boss.enraged?.7:1);
          previous.move=boss.move;
        }
        previous.previous=boss.timer;
        const charge=Math.max(0,Math.min(1,1-boss.timer/previous.duration));
        const radius=boss.move==='slam'?BOSS_SLAM.radius:boss.move==='sweep'?3.8:3.1;
        root.position.set(boss.move==='slam'?boss.slamX:boss.x,.22,boss.move==='slam'?boss.slamZ:boss.z);
        root.scale.set(radius,1,radius);
        root.userData.charge=charge;
        const art=root.children[0] as Mesh<import('three').BufferGeometry,MeshBasicMaterial>;
        art.rotation.z=reducedMotion.matches?0:charge*.65;
        art.material.opacity=(.4+charge*.4)*soften;
        const edge=root.children[1] as Mesh<import('three').BufferGeometry,MeshBasicMaterial>;
        edge.material.opacity=.65+charge*.3;
        edge.material.color.set(boss.timer<BOSS_SLAM.commit?'#ff694d':'#ff2820');
        const arc=root.children[2] as Mesh<import('three').BufferGeometry,MeshBasicMaterial>;
        arc.scale.setScalar(reducedMotion.matches?.6:.9-.65*charge);
        arc.material.opacity=(.25+.55*charge)*soften;
      }else windup.current.previous=0;
    }
    bursts.current?.children.forEach((group,i)=>{
      const effect=game.effects[i];
      group.visible=game.zone==='office'&&!!effect?.ground&&effect.age<BOSS_VFX.duration;
      if(!group.visible||!effect)return;
      group.position.set(effect.x,.23,effect.z);
      group.rotation.y=effect.yaw??0;
      const burst=slamBurst(effect.age);
      const decal=group.children[0] as Mesh;
      decal.visible=!!maps.impact;
      decal.scale.setScalar(burst.size);
      (decal.material as MeshBasicMaterial).opacity=burst.opacity*soften;
      const flash=group.children[1] as Sprite;
      flash.visible=!!maps.impact&&burst.flash>0;
      flash.position.y=.75;
      flash.scale.set(burst.size*.75,burst.size*.45,1);
      flash.material.opacity=burst.flash*soften;
      for(let layer=0;layer<BOSS_VFX.layers;layer++){
        const mesh=group.children[layer+2] as Mesh<ReturnType<typeof createRippleGeometry>,MeshBasicMaterial>;
        const ripple=slamRipple(effect.age,layer);
        mesh.visible=ripple.visible;
        if(!ripple.visible)continue;
        mesh.rotation.z=effect.age*(layer%2?-.18:.18);
        mesh.position.y=.015*layer;
        updateRippleGeometry(mesh.geometry,ripple.radius,ripple.width,ripple.height*soften,effect.age+layer);
        mesh.material.opacity=ripple.opacity*soften;
      }
    });
    const root=wave.current;
    if(!root)return;
    root.visible=game.zone==='office'&&boss.wave>=0&&boss.hp>0;
    if(!root.visible)return;
    // World-space origin must not inherit boss recoil, turning or later pursuit.
    root.position.set(boss.waveX,.23,boss.waveZ);
    root.userData.radius=boss.wave;
    root.children.forEach((child,i)=>{
      const mesh=child as Mesh<ReturnType<typeof createRippleGeometry>,MeshBasicMaterial>;
      if(i===3){
        mesh.visible=boss.wave>.3;
        const emergence=Math.min(1,boss.wave/2,Math.max(0,(36-boss.wave)/3));
        updateRippleGeometry(mesh.geometry,boss.wave,1.2,.85*emergence*soften,boss.wave/7);
        mesh.material.opacity=.32*emergence*soften;
        return;
      }
      const radius=i===1?boss.wave-1.25:i===2?boss.wave+.55:boss.wave;
      mesh.visible=radius>.1;
      if(!mesh.visible)return;
      updateRippleGeometry(mesh.geometry,radius,i===2?.1:i===1?.65:1.2,
        (i===2?.025:i===1?.25:.9)*Math.min(1,boss.wave/2,Math.max(0,(36-boss.wave)/3))*soften,boss.wave/7+i);
      mesh.position.y=i===0?.04:.02;
      mesh.material.opacity=(i===2?.65:i===1?.3:.8)*soften;
      if(i===2)mesh.material.color.set('#89eaff');
    });
  });
  return <>
    <mesh ref={boost} name="boss-pursuit-boost" visible={false} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.9,1,48]}/>
      <meshBasicMaterial color="#ffb34d" transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false}/>
    </mesh>
    <group ref={warning} name="boss-attack-telegraph" visible={false} userData={{style:'segmented-energy'}}>
      <mesh geometry={segments} rotation={[-Math.PI/2,0,0]}>
        <meshBasicMaterial color="#ff3824" transparent blending={AdditiveBlending} opacity={.75} depthWrite={false} toneMapped={false}/>
      </mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.005,0]}>
        <ringGeometry args={[.985,1,96]}/>
        <meshBasicMaterial color="#ff4534" transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false}/>
      </mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.01,0]}>
        <ringGeometry args={[.96,1,96]}/>
        <meshBasicMaterial color="#ff7452" transparent opacity={.8} blending={AdditiveBlending} depthWrite={false} toneMapped={false}/>
      </mesh>
    </group>
    <group ref={bursts} name="boss-hammer-ground-bursts" userData={{texturesReady:!!maps.impact&&!!maps.ripple}}>
      {Array.from({length:8},(_,i)=><group key={i} visible={false}>
        <mesh rotation={[-Math.PI/2,0,0]}>
          <planeGeometry args={[1,1]}/>
          <meshBasicMaterial map={maps.impact} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false}/>
        </mesh>
        <sprite><spriteMaterial map={maps.impact} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false}/></sprite>
        {Array.from({length:BOSS_VFX.layers},(_,j)=><Ripple key={j} texture={maps.ripple}/>)}
      </group>)}
    </group>
    <group ref={wave} name="boss-water-shockwave" visible={false}>
      <Ripple texture={maps.ripple}/><Ripple texture={maps.ripple}/><Ripple texture={null}/>
      <GroundCrest/>
    </group>
  </>;
}
