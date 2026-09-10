import { occupied, rayFraction } from './collision';
import type { Collider } from './world';
export type NavPoint={x:number;z:number};
export const BOSS_BODY_RADIUS=1.6;
const radius=BOSS_BODY_RADIUS+.1;
export function bossPathClear(colliders:Collider[],a:NavPoint,b:NavPoint){
  // Contact is resolved at the physical radius. Inflating the segment here
  // traps an already-touching boss inside every outgoing navigation edge.
  return !colliders.some(c=>rayFraction(c,{...a,y:.15},{...b,y:.15},BOSS_BODY_RADIUS-.001)!==null);
}
/** Small visibility graph around furniture corners; computed on a cooldown,
 * not each animation frame. The fallback approaches an unreachable raised target. */
export function bossPath(colliders:Collider[],start:NavPoint,target:NavPoint):NavPoint[]{
  if(bossPathClear(colliders,start,target))return [target];
  const nodes:NavPoint[]=[start];
  for(const c of colliders){
    const x=(c.radius??(c.w??0)/2)+radius+.16;
    const z=(c.radius??(c.d??0)/2)+radius+.16;
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const p={x:c.x+sx*x,z:c.z+sz*z};
      if(!occupied(colliders,p.x,p.z,0,radius))nodes.push(p);
    }
  }
  if(!occupied(colliders,target.x,target.z,0,radius))nodes.push(target);
  const costs=nodes.map(()=>Infinity),parents=nodes.map(()=>-1),visited=new Set<number>();
  costs[0]=0;
  while(visited.size<nodes.length){
    let next=-1;
    for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(next<0||costs[i]<costs[next]))next=i;
    if(next<0||!Number.isFinite(costs[next]))break;
    visited.add(next);
    for(let i=1;i<nodes.length;i++){
      if(visited.has(i))continue;
      const cost=costs[next]+Math.hypot(nodes[next].x-nodes[i].x,nodes[next].z-nodes[i].z);
      if(cost<costs[i]&&bossPathClear(colliders,nodes[next],nodes[i])){costs[i]=cost;parents[i]=next;}
    }
  }
  let best=0,bestDistance=Infinity;
  for(const i of visited){
    const distance=Math.hypot(nodes[i].x-target.x,nodes[i].z-target.z);
    if(distance<bestDistance){bestDistance=distance;best=i;}
  }
  const path:NavPoint[]=[];
  while(best>0){path.unshift(nodes[best]);best=parents[best];}
  return path;
}
