"""Low-rise city horizons and garden furnishings, matching the existing estate palette."""
from pathlib import Path
import json,random
exec(Path(__file__).with_name('build_estate.py').read_text().split('# Main block:')[0])
scene.name='President_Park_Landscape';root.name='LandscapeRoot'
random.seed(37)
def distant_window(x,y,z,w,h,g,angle=0):
 o=instance('District window',x,y,z,(w,1,h),[(-.5,0,-.5),(.5,0,-.5),(.5,0,.5),(-.5,0,.5)],[(0,1,2,3)],'glass',g,'windowQuad');o.rotation_euler.z=angle

layout=json.loads((BASE/'src/game/landscape-layout.json').read_text())
for i,p in enumerate(layout):
 x,z=p['x'],p['z'];k=p['kind'];s=p.get('size',1);g='GardenEast' if x>0 else 'GardenWest'
 if k=='tree':
  cyl('Landscape tree trunk',x,2.6*s,z,.32*s,5.2*s,'trunk',g,v=7)
  for dx,dy,dz,r in [(-1,5.4,0,2.3),(1.1,6.2,.3,2.5),(0,7.6,-.3,2.2)]:sphere('Broadleaf canopy',x+dx*s,dy*s,z+dz*s,r*s,'leaf' if i%3 else 'leaf2',g)
 elif k=='bed':
  box('Raised flower bed',x,.17,z,8,.34,5,'shadow',g)
  box('Garden soil',x,.36,z,7.6,.05,4.6,'trunk',g)
  for dx in [-3.65,3.65]:box('Boxwood border',x+dx,.65,z,.55,.65,4.65,'leaf',g)
  for dz in [-2.2,2.2]:box('Boxwood border',x,.65,z+dz,7.5,.65,.45,'leaf',g)
  for j in range(28):
   xx=x-3+(j%7);zz=z-1.5+(j//7);sphere('Rose flowers',xx,.72+(j%3)*.08,zz,.20,'red' if j%3 else 'trim',g)
 elif k=='bench':
  for h in [.58,.70]:box('Park bench seat',x,h,z,3,.12,.8,'trunk',g)
  for y in [1.03,1.31]:box('Park bench back',x,y,z-.40,3,.20,.10,'trunk',g)
  for dx in [-1.15,1.15]:
   box('Bench metal support',x+dx,.38,z,.12,.76,.65,'dark',g)
   box('Bench back support',x+dx,.95,z-.40,.10,1.0,.12,'dark',g)
  cyl('Rest pocket paving',x,.015,z,2.5,.03,'path',g,v=24)
 elif k=='lamp':
  cyl('Walkway lamp base',x,.16,z,.24,.32,'dark',g)
  cyl('Walkway lamp stem',x,1.8,z,.055,3.6,'dark',g)
  box('Lantern warm pane',x,3.50,z,.35,.55,.35,'gold',g)
  cyl('Lantern cap',x,3.83,z,.28,.12,'dark',g,v=4)
 elif k=='rock':
  o=sphere('Garden boulder',x,.55*s,z,s,'shadow',g);o.scale.z*=.6
# Main footpath and branch connections; stripes break up large uniform green fields.
box('South lawn pedestrian spine',0,.018,97,4.4,.02,150,'path','Paths')
for side in [-1,1]:
 for z in [142,110,78,46]:box('Garden crosswalk',side*13,.023,z,22,.02,2.4,'path','Paths')
 for i in range(9):box('Mown lawn stripe',side*45,.009,40+i*15,72,.012,6,'grass','Paths')
# Layered low-rise districts wrap the entire horizon outside the playable boundary.
for layer,radius,count in [(0,480,66),(1,790,92)]:
 for i in range(count):
  a=i*math.tau/count+.017*layer
  x=math.sin(a)*radius;z=70+math.cos(a)*radius
  # Keep the Ellipse and Monument's north-south vista open in the nearer ring.
  if z>300 and abs(x)<260:continue
  if layer==0 and z<0 and abs(x)<400:continue
  w=random.uniform(24,42);d=random.uniform(24,46);h=random.uniform(24,48) if layer==0 else random.uniform(30,70)
  g='CityEast' if x>0 else 'CityWest';stone='shadow' if i%3==0 else 'stone'
  box('District stone block',x,h/2,z,w,h,d,stone,g)
  for y in [1.5,h*.48,h-.7]:box('District cornice',x,y,z,w+.7,.55,d+.7,'trim',g)
  box('District roof',x,h+1.2,z,w-1,2.4,d-1,'roof',g)
  if i%4==0:
   box('Mansard pavilion',x,h+4,z,w*.42,5,d*.55,'roof',g)
   cyl('Roof lantern',x,h+8,z,2,4,'shadow',g,v=8)
  if i%5==0:box('Roof chimney',x+w*.25,h+4,z-3,1.8,6,2,'red',g)
  for side in [-1,1]:
   for xx in range(4,int(w)-2,6):
    for yy in range(6,int(h)-2,7):distant_window(x-w/2+xx,yy,z+side*(d/2+.08),2.3,3.3,g,0 if side>0 else math.pi)
   for zz in range(4,int(d)-2,7):
    for yy in range(6,int(h)-2,7):distant_window(x+side*(w/2+.08),yy,z-d/2+zz,2.3,3.3,g,side*math.pi/2)
# Street tree belts stitch the skyline to the existing park edges.
for i in range(110):
 a=i*math.tau/110;x=math.sin(a)*385;z=70+math.cos(a)*360
 if z>300 and abs(x)<220:continue
 cyl('District avenue trunk',x,4,z,.5,8,'trunk','CityTrees',v=6)
 sphere('District avenue canopy',x,11,z,5.5,'leaf','CityTrees')
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for o in root.children_recursive:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(BASE/'public/models/park-landscape.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False)
bpy.data.libraries.write(str(BASE/'assets/blender/park-landscape.blend'),{scene},fake_user=True,compress=True)
bpy.context.window.scene=original
result={'asset':'park-landscape.glb','garden_objects':len(layout)}
