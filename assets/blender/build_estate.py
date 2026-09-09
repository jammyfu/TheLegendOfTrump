"""Historical White House / President's Park massing. 1 metre = 1.4 game units.
Main residence dimensions: White House Historical Association.
Public landmark orientation: NPS President's Park. Surrounding massing is approximate.
Build in an isolated Blender scene; leave the user's GUI scene untouched.
"""
import bpy, math, os
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]
original=bpy.context.window.scene
scene=bpy.data.scenes.new('White_House_Estate');bpy.context.window.scene=scene
M=1.4
mats={}
for n,c in [('stone','e6e1cf'),('trim','faf4df'),('shadow','b8b9af'),('glass','456477'),('roof','566971'),('gold','b29456'),('grass','819d63'),('path','c3bca8'),('road','737e7e'),('trunk','75624a'),('leaf','66834f'),('leaf2','789652'),('red','a4463c'),('dark','334842')]:
 rgb=[int(c[i:i+2],16)/255 for i in (0,2,4)];rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
 mat=bpy.data.materials.new(n);mat.diffuse_color=(*rgb,1);mat.use_nodes=True;p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.86;mats[n]=mat
root=bpy.data.objects.new('EstateRoot',None);scene.collection.objects.link(root)
groups={}
def parent(n):
 if n not in groups:
  o=bpy.data.objects.new(n,None);scene.collection.objects.link(o);o.parent=root;groups[n]=o
 return groups[n]
cache={}
def instance(n,x,y,z,scale,vs,fs,mat,g,key):
 if (key,mat) not in cache:
  data=bpy.data.meshes.new(key+mat);data.from_pydata(vs,[],fs);data.materials.append(mats[mat]);cache[(key,mat)]=data
 o=bpy.data.objects.new(n,cache[(key,mat)]);scene.collection.objects.link(o);o.parent=parent(g);o.location=(x,-z,y);o.scale=scale;return o
def box(n,x,y,z,w,h,d,mat='stone',g='Mansion'):
 vs=[(a*.5,b*.5,c*.5) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 fs=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
 return instance(n,x,y,z,(w,d,h),vs,fs,mat,g,'box')
def cyl(n,x,y,z,r,h,mat='stone',g='Mansion',v=12):
 vs=[(math.cos(i*math.tau/v),math.sin(i*math.tau/v),j*.5) for j in [-1,1] for i in range(v)]
 fs=[tuple(reversed(range(v))),tuple(range(v,2*v))]+[(i,(i+1)%v,(i+1)%v+v,i+v) for i in range(v)]
 return instance(n,x,y,z,(r,r,h),vs,fs,mat,g,'cyl'+str(v))
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1)
_ico=bpy.context.object
ICO_V=[tuple(v.co) for v in _ico.data.vertices];ICO_F=[tuple(p.vertices) for p in _ico.data.polygons]
bpy.data.objects.remove(_ico,do_unlink=True)
def sphere(n,x,y,z,r,mat='leaf',g='Trees'):
 return instance(n,x,y,z,(r,r,r),ICO_V,ICO_F,mat,g,'ico')
def mesh(n,vs,fs,mat,g):
 d=bpy.data.meshes.new(n);d.from_pydata([(x,-z,y) for x,y,z in vs],[],fs);d.materials.append(mats[mat]);o=bpy.data.objects.new(n,d);scene.collection.objects.link(o);o.parent=parent(g);return o
def ring(n,x,z,rx,rz,width,mat,g,y=.03):
 vs=[]
 for i in range(97):
  a=i*math.tau/96
  for k in [-1,1]:vs.append((x+math.sin(a)*(rx+k*width/2),y,z+math.cos(a)*(rz+k*width/2)))
 mesh(n,vs,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(96)],mat,g)
def window(x,y,z,w=2,h=3.6,g='Mansion',side=False):
 if side:
  for off,ww,hh,dd,ma in [(0,.12,h+.3,w+.3,'trim'),(.1,.06,h,w,'glass')]:box('Window',x+off,y,z,ww,hh,dd,ma,g)
 else:
  box('Window surround',x,y,z,w+.3,h+.35,.12,'trim',g);box('Window glass',x,y,z+.12,w,h,.08,'glass',g)
  box('Sash vertical',x,y,z+.18,.07,h,.05,'trim',g)
  for a in [-.3,0,.3]:box('Sash bar',x,y+a*h,z+.18,w,.06,.05,'trim',g)
  box('Window sill',x,y-h/2-.14,z+.16,w+.5,.16,.4,'shadow',g)
# Main block: 51.2 m wide, 26.1 m deep, 21.34 m to roof.
W,D,H=51.2*M,26.1*M,21.34*M
Z=-17-D/2
box('Residence',0,12.65,Z,W,25.3,D)
for y,h,over in [(1,.7,.6),(6.0,.22,.3),(14.2,.3,.5),(24.2,.35,.8),(25.4,.6,1.2)]:box('Continuous cornice',0,y,Z,W+over,h,D+over,'trim')
box('Roof attic',0,27.2,Z,W-5,3.7,D-5,'stone')
box('Roof coping',0,H-.18,Z,W-4.5,.36,D-4.5,'trim')
box('Flat roof',0,H-.4,Z,W-6,.12,D-6,'roof')
for i in range(13):
 x=(i-6)*5.25
 for y,h in [(3.35,3.5),(10.3,5.2),(18.6,4.5)]:window(x,y,-16.98,2.3,h)
 window(x,27.1,-19.45,1.8,1.65)
 # Northern elevation, behind the mansion.
 for y in [3.4,10.3,18.6]:
  box('North window',x,y,-53.63,2.3,3.6,.15,'glass');box('North lintel',x,y+1.95,-53.68,2.65,.2,.25,'trim')
for side in [-1,1]:
 for z in [-21,-27,-33,-39,-45,-50]:
  for y in [3.4,10.3,18.6]:window(side*(W/2+.04),y,z,2.4,3.8,side=True)
 for x in [side*25,side*30]:box('Roof chimney',x,H+.65,-40,1.35,2.3,1.5,'stone')
# Two-storey curved south portico. The access lane stays level and playable.
for y in [6.0,14.2,24.2]:
 cyl('South portico terrace',0,y,-17.4,10.4,.5,'trim',v=40)
for i,a in enumerate([-1.4,-.85,-.3,.3,.85,1.4]):
 x,z=math.sin(a)*8.8,-17.4+math.cos(a)*6.0
 cyl('Ground arcade pier',x,3,z,.7,6,'stone',v=16)
 cyl('South column',x,15.1,z,.52,18.0,'stone',v=16)
 for y in [6.15,23.95]:cyl('Ionic column capital',x,y,z,.8,.32,'trim')
# Balcony railing, read as a thin band at real door scale.
ring('Truman balcony rail',0,-17.4,10.15,10.15,.14,'trim','Mansion',15.45)
for i in range(30):
 a=-math.pi/2+i*math.pi/29;x,z=math.sin(a)*10.15,-17.4+math.cos(a)*10.15
 cyl('Balcony baluster',x,14.9,z,.075,1.15,'trim',v=6)
box('Arrival doorway',0,2.2,-16.70,2.8,4.4,.22,'gold');box('Entrance dark door',0,2.1,-16.52,2.25,4.1,.12,'dark')
for i in range(4):box('Entrance stair',0,.1+i*.1,-13.2-i*.47,9.6-i*.28,.2+i*.2,3.2-i*.5,'shadow')
# North portico and pediment.
box('North portico lintel',0,22,-58,23,.8,9,'trim')
for x in [-9,-5.4,-1.8,1.8,5.4,9]:cyl('North column',x,13.5,-61,.55,16,'trim')
mesh('North pediment',[(-12,22.4,-62),(12,22.4,-62),(0,27,-62),(-12,22.4,-54),(12,22.4,-54),(0,27,-54)],[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(0,2,5,3)],'trim','Mansion')
# Historical low colonnades connecting the residence to unequal wings.
for side,g in [(-1,'WestWing'),(1,'EastWing')]:
 box('Colonnade roof',side*61,5.7,-36,52,.6,8,'trim',g)
 for x in range(38,85,4):cyl('Colonnade pillar',side*x,2.8,-32,.25,5.6,'stone',g)
 x,z,w,d=( -104,-34,36,34) if side<0 else (105,-43,38,25)
 box('Wing main volume',x,4.8,z,w,9.6,d,'stone',g);box('Wing cornice',x,9.75,z,w+.8,.4,d+.8,'trim',g)
 for xx in range(int(x-w/2+3),int(x+w/2),5):
  for y in [2.7,6.8]:window(xx,y,z+d/2+.02,1.8,2.7,g)
 box('Wing low roof',x,10.1,z,w-1,.25,d-1,'roof',g)
 if side<0:cyl('Oval Office exterior',x+6,3.8,z+d/2-2,8,7.6,'stone',g,v=32)
# Treasury (east): long classical granite facades and colonnades.
x,z=250,-35;g='Treasury'
box('Treasury main',x,20,z,95,40,155,'shadow',g)
for y in [3,12,35,40.5]:box('Treasury cornice',x,y,z,97,.9,157,'stone',g)
for zz in range(-104,39,7):
 for side in [-1,1]:
  cyl('Treasury colonnade',x+side*49,24,zz,.9,22,'stone',g)
  for y in [7,17,29]:box('Treasury side window',x+side*47.6,y,zz,.15,4.2,2.7,'glass',g)
for xx in range(209,293,7):
 for y in [7,18,29]:window(xx,y,42.6,2.8,4.2,g)
# Eisenhower Executive Office Building (west): mansard roof, pavilions and dormers.
x,z=-260,-43;g='Eisenhower'
box('Executive office stonework',x,24,z,123,48,139,'shadow',g)
for y in [4,13,24,35,46,48]:box('Executive office cornice',x,y,z,125,.65,141,'stone',g)
box('Mansard roof',x,52,z,120,8,137,'roof',g)
for xx in [-312,-287,-260,-233,-208]:
 box('Pavilion',xx,29,28,15,58,10,'stone',g);box('Pavilion roof',xx,61,28,17,7,12,'roof',g)
 for y in [8,18,29,40,51]:window(xx,y,33.1,3.2,5.0,g)
for xx in range(-315,-200,6):
 for y in [8,18,29,40]:window(xx,y,26.6,2.8,4.8,g)
 box('Mansard dormer',xx,53.5,26,3.3,5,2.5,'stone',g);box('Dormer glass',xx,53.3,27.3,2.0,3.1,.1,'glass',g)
for side in [-1,1]:
 for zz in range(-105,20,7):
  for y in [8,18,29,40]:box('Executive side window',x+side*61.6,y,zz,.12,4.5,2.8,'glass',g)
# Ground plane and public park drives. Background locations are geographic massing.
box('District ground',0,-.25,200,2100,.3,2400,'grass','Park')
ring('South lawn carriage drive',0,90,116,107,8,'path','Park')
ring('Ellipse outer road',0,495,224,172,14,'road','Park')
ring('Ellipse walking path',0,495,213,161,4,'path','Park',.06)
ring('North lawn drive',0,-110,74,38,7,'path','Park')
box('Pennsylvania Avenue',0,.025,-206,750,.04,18,'road','Park')
for side in [-1,1]:box('Executive Avenue',side*155,.025,-10,15,.04,450,'road','Park')
box('South Executive Avenue',0,.025,257,325,.04,14,'road','Park')
box('Constitution Avenue',0,.025,698,1000,.04,23,'road','Park')
# Washington Monument sits far south; its public height is approximately 169 m.
x,z=12,1240;h=169.3*M;g='WashingtonMonument';w=16*M
box('Obelisk shaft',x,(h-16)/2,z,w,h-16,w,'stone',g)
mesh('Pyramidion',[(x-w/2,h-16,z-w/2),(x+w/2,h-16,z-w/2),(x+w/2,h-16,z+w/2),(x-w/2,h-16,z+w/2),(x,h,z)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],'trim',g)
# Northern city silhouettes frame Lafayette Square, leave central park open.
for i in range(13):
 x=-380+i*62;z=-350-(i%3)*25;h=28+(i%4)*7;g='CityBlocks'
 box('Downtown block',x,h/2,z,48,h,50,'shadow' if i%2 else 'stone',g)
 box('Downtown roof',x,h+.2,z,49,.4,51,'roof',g)
 for xx in [-16,-8,0,8,16]:
  for y in range(6,int(h),8):box('City window',x+xx,y,z+25.1,3,3.8,.1,'glass',g)
# Tree groves frame open views; deterministic, merged by shared material.
for side in [-1,1]:
 for i in range(27):
  x=side*(91+(i%3)*13);z=-115+i*13;h=8+(i%5)*1.2
  cyl('Park tree trunk',x,h*.4,z,.45,h*.8,'trunk','Trees',v=7)
  for j in range(3):sphere('Park canopy',x+(j-1)*2,h+abs(j-1),z+(j%2)*2,4+(i%3)*.6,'leaf' if i%2 else 'leaf2')
 for i in range(25):
  a=i*math.pi/24;x=math.cos(a)*245;z=495+math.sin(a)*side*188
  cyl('Ellipse tree trunk',x,3,z,.5,6,'trunk','DistantTrees',v=6);sphere('Ellipse canopy',x,10,z,6,'leaf','DistantTrees')
# Perimeter fence at the actual playable boundary, kept distinct from scenery.
for x in range(-140,141,4):
 for z in [-160,235]:
  box('Fence post',x,1.45,z,.11,2.9,.11,'dark','Fence')
  for y in [.6,2.2]:box('Fence rail',x,y,z,4,.08,.08,'dark','Fence')
for side in [-1,1]:
 for z in range(-160,236,4):
  box('Fence post',side*140,1.45,z,.11,2.9,.11,'dark','Fence')
  for y in [.6,2.2]:box('Fence rail',side*140,y,z,.08,.08,4,'dark','Fence')
# Export shared instances; glTF Transform joins by material after export.
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for o in root.children_recursive:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(BASE/'public/models/white-house-estate.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False)
bpy.data.libraries.write(str(BASE/'assets/blender/white-house-estate.blend'),{scene},fake_user=True)
bpy.context.window.scene=original
result={'asset':'white-house-estate.glb','metre':M,'residence':[W,D,H]}
