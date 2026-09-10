import { Float32BufferAttribute, RingGeometry, Sphere, Vector3, DynamicDrawUsage } from 'three';

/** Reusable low-poly ribbon: actual world radius/width, with a small fluid crest.
 * No framebuffer refraction, extra lights, shadow passes, or per-frame allocation. */
export function createRippleGeometry() {
  const geometry=new RingGeometry(.7,1,64,12);
  const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  const data=new Float32Array(positions.count*4);
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),r=Math.hypot(x,y);
    const across=Math.max(0,Math.min(1,(r-.7)/.3));
    data.set([x/r,y/r,across,Math.atan2(y,x)],i*4);
    // Sample only the generated texture's water ring, not its empty center.
    uv.setXY(i,.5+x/r*(.31+across*.18),.5+y/r*(.31+across*.18));
  }
  geometry.setAttribute('rippleData',new Float32BufferAttribute(data,4));
  if(positions instanceof Float32BufferAttribute)positions.setUsage(DynamicDrawUsage);
  geometry.boundingSphere=new Sphere(new Vector3(),1);
  return geometry;
}
export function updateRippleGeometry(geometry:RingGeometry,radius:number,width:number,height:number,time:number){
  const positions=geometry.getAttribute('position'),data=geometry.getAttribute('rippleData');
  for(let i=0;i<positions.count;i++){
    const across=data.getZ(i),angle=data.getW(i);
    const r=Math.max(.01,radius+(across-.5)*width);
    const crest=Math.sin(across*Math.PI)*height*(.82+.18*Math.sin(angle*9-time*12));
    positions.setXYZ(i,data.getX(i)*r,data.getY(i)*r,crest);
  }
  positions.needsUpdate=true;
  geometry.boundingSphere!.radius=Math.max(.01,radius)+width+height;
}
