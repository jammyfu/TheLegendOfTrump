import { Color, Float32BufferAttribute, RingGeometry } from 'three';

/** Black at the edges contributes zero light under additive blending. */
export function colorEnergyBand(geometry:RingGeometry,color:string){
  const data=geometry.getAttribute('rippleData');
  const rgb=new Color(color),colors=new Float32Array(data.count*3);
  for(let i=0;i<data.count;i++){
    const glow=Math.sin(data.getZ(i)*Math.PI)**1.4;
    colors.set([rgb.r*glow,rgb.g*glow,rgb.b*glow],i*3);
  }
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
  return geometry;
}

export function createWarningSegments(){
  const geometry=new RingGeometry(.82,.91,96,1);
  const indices=Array.from(geometry.index!.array);
  geometry.setIndex(indices.filter((_,i)=>Math.floor(i/6)%8<6));
  return geometry;
}
