import { RUSH, rushPose } from "../game/rush";
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, Group, Mesh, MeshBasicMaterial } from 'three';
import { game } from '../game/simulation';
/** A small, reusable geometry pool: all streaks follow the actual rush heading. */
export function RushEffects() {
  const root = useRef<Group>(null);
  useFrame(() => {
    const g = root.current;
    if (!g) return;
    g.visible = !!game.rush && !game.rushRebounding && game.phase === 'playing';
    if (!g.visible) return;
    g.position.set(game.x,game.y+1.35,game.z); g.rotation.y = game.yaw;
    const shield = game.rush === 'shield';
    const pose = rushPose(game.rush!,game.rushTime);
    const t = pose.elapsed/RUSH[game.rush!].duration;
    g.position.y += pose.lift;
    if (!shield && !pose.active) { g.visible = false; return; }
    g.children.forEach((child,i) => {
      const mesh = child as Mesh;
      const m = mesh.material as MeshBasicMaterial;
      m.color.set(shield ? '#86e8ff' : '#ffe59b');
      // Keep the two-handed brace legible through the charge streaks.
      m.opacity = Math.sin(t*Math.PI)*(shield ? (i<3 ? .24 : .14) : game.rush==='punch' ? .24 : .8);
      if (i < 3) {
        const pulse = (t*3+i/3)%1;
        mesh.position.set(0,0, shield ? 1.1-pulse*2 : 1-pulse*4);
        mesh.scale.setScalar((shield ? 1.1 : .5)+pulse*.65);
      } else {
        const a = (i-3)*Math.PI/4;
        mesh.position.set(Math.cos(a)*.8, Math.sin(a)*.65, -.6);
        mesh.scale.set(.035,.035,(shield ? 2.6 : 4.2)*Math.sin(t*Math.PI));
      }
    });
  });
  return <group ref={root} visible={false}>
    {Array.from({length:11},(_,i)=><mesh key={i}>
      {i<3 ? <ringGeometry args={[.82,1,24]}/> : <boxGeometry args={[1,1,1]}/>}
      <meshBasicMaterial transparent opacity={0} blending={AdditiveBlending} side={DoubleSide} depthWrite={false} toneMapped={false}/>
    </mesh>)}
  </group>;
}
