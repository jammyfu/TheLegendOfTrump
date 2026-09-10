import {DoubleSide,Material,Mesh,MeshBasicMaterial,Object3D,RingGeometry} from 'three';

/** Temporal average for thin blades: no texture download or full-screen blur. */
export function createRotorVisual(rotor:Object3D,radius:number,axis:'x'|'y') {
 const blades:Mesh[]=[], materials:Material[]=[];
 const originals=new Map<Mesh,Material|Material[]>();
 rotor.traverse(n=>{
  if(!(n instanceof Mesh))return;
  blades.push(n);
  originals.set(n,n.material);
  const clone=(m:Material)=>{const c=m.clone();c.side=DoubleSide;materials.push(c);return c;};
  n.material=Array.isArray(n.material)?n.material.map(clone):clone(n.material);
 });
 const geometry=new RingGeometry(radius*.09,radius,96,4);
 const material=new MeshBasicMaterial({color:0x37433e,transparent:true,opacity:0,depthWrite:false,side:DoubleSide,toneMapped:false});
 const blur=new Mesh(geometry,material);blur.name='Rotor motion blur';
 if(axis==='y')blur.rotation.x=-Math.PI/2;else blur.rotation.y=Math.PI/2;
 rotor.add(blur);
 return {
  blur,
  update(speed:number){
   const t=Math.max(0,Math.min(1,(speed-.12)/.45));
   const blend=t*t*(3-2*t);
   blur.visible=blend>0;material.opacity=.1*blend;
   for(const m of materials){
    const transparent=blend>0;
    if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}
    m.opacity=1-.94*blend;m.depthWrite=!transparent;
   }
   for(const b of blades)b.castShadow=blend<.25;
  },
  dispose(){rotor.remove(blur);originals.forEach((m,b)=>{b.material=m;});geometry.dispose();material.dispose();materials.forEach(m=>m.dispose());},
 };
}
