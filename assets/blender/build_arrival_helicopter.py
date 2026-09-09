"""Stylized VH-3-inspired arrival aircraft. Blender Z-up; front -Y.
Run through Blender MCP in an isolated background process.
"""
import bpy, math, os
from mathutils import Vector
BASE='/Users/jammyfu/works/AI/PersonalProject/TheLegendOfTrump'
def build():
 old=bpy.context.window.scene
 scene=bpy.data.scenes.new('Trump_Arrival_Helicopter');bpy.context.window.scene=scene
 def mat(name,hexcode,metal=0):
  rgb=[int(hexcode[i:i+2],16)/255 for i in (0,2,4)];rgb=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb]
  m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.42;return m
 green=mat('Presidential forest green','17493c',.3);white=mat('Ivory upper fuselage','e4e3d4');glass=mat('Smoked cockpit glass','173547',.6);metal=mat('Titanium rotor hub','58646b',.65);black=mat('Rubber and rotor','172025');gold=mat('Gold coachline','d8b75c',.5);red=mat('Navigation red','d63725');silver=mat('Window highlight','7899aa',.4)
 def empty(name,loc=(0,0,0),parent=None):
  o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.location=loc;o.parent=parent;return o
 root=empty('ArrivalAircraft')
 def mesh(name,vs,fs,material,parent=root):
  d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.materials.append(material);d.update();o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.parent=parent;return o
 def box(name,loc,scale,m,parent=root,bevel=.04):
  bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  if bevel: mod=o.modifiers.new('Rounded manufactured edge','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
  o.data.materials.append(m);return o
 def ell(name,loc,scale,m):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8);o=bpy.context.object;o.name=name;o.parent=root;o.location=loc;o.scale=scale;o.data.materials.append(m);return o
 def rod(name,a,b,r,m,parent=root):
  a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=(b-a).length);o=bpy.context.object;o.name=name;o.parent=parent;o.location=(a+b)/2;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.data.materials.append(m);return o
 # Lofted hull: broad cabin with tapered boat nose and narrowing rear body.
 sections=[(-5.3,.25,1.5,.35),(-4.65,1.25,2.05,1.0),(-3.15,1.85,2.6,1.65),(1.9,1.85,2.6,1.65),(3.8,1.25,2.6,1.25),(4.7,.6,2.65,.65)]
 profile=[(-.65,-1),(.65,-1),(1,-.55),(1,.5),(.72,1),(-.72,1),(-1,.5),(-1,-.55)]
 vs=[(x*w,y,z+v*h) for y,w,z,h in sections for x,v in profile];fs=[tuple(reversed(range(8)))]
 for j in range(len(sections)-1):
  for i in range(8):fs.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
 fs.append(tuple(range(40,48)));hull=mesh('Sculpted boat hull',vs,fs,green);hull.data.materials.append(white)
 for f in hull.data.polygons:f.material_index=int(sum(hull.data.vertices[i].co.z for i in f.vertices)/len(f.vertices)>3.05)
 # Separate framed windshield panels, no spherical glass bubble.
 for side in [-1,1]:
  panel=[(side*.10,-4.83,3.06),(side*1.02,-4.7,3.10),(side*1.45,-3.2,4.28),(side*.10,-3.2,4.35)]
  mesh('Cockpit windshield',panel,[(0,1,2,3)],glass)
  for a,b in zip(panel,panel[1:]+panel[:1]):rod('Windshield frame',a,b,.045,white)
  mesh('Pilot side glazing',[(side*1.94,-3.13,2.85),(side*1.94,-1.9,2.85),(side*1.62,-1.9,3.96),(side*1.62,-3.1,3.94)],[(0,1,2,3)],glass)
  for y in [-.75,.45,1.65,2.7]:
   x=1.88 if y<2 else 1.62
   box('Cabin window frame',(side*x,y,3.04),(.07,.82,.88),white,bevel=.12)
   box('Cabin window glass',(side*(x+.05),y,3.04),(.025,.65,.69),glass,bevel=.1)
  box('Gold cheatline',(side*1.88,-.2,2.47),(.03,6.2,.075),gold,bevel=0)
  ell('Gear sponson',(side*1.88,1.8,1.35),(.65,1.5,.52),green)
  rod('Main gear strut',(side*2,1.65,1.35),(side*2.15,1.65,.53),.13,metal)
  rod('Main landing tire',(side*1.91,1.65,.53),(side*2.35,1.65,.53),.53,black)
  rod('Wheel hub',(side*2.36,1.65,.53),(side*2.39,1.65,.53),.24,metal)
  ell('Engine nacelle',(side*.8,.2,4.23),(.65,1.7,.53),white)
  rod('Engine intake',(side*.8,-1.55,4.28),(side*.8,-1.4,4.28),.36,black)
  rod('Exhaust',(side*.83,1.55,4.22),(side*.83,2.05,4.22),.29,metal)
  # Side identity plate is geometry, not an external texture.
  bpy.ops.object.text_add();o=bpy.context.object;o.name='Presidential identity';o.parent=root;o.data.body='UNITED STATES';o.data.size=.26;o.data.extrude=.001;o.data.align_x='CENTER';o.location=(side*1.94,.25,2.65);o.rotation_euler=(math.pi/2,0,side*math.pi/2);o.data.materials.append(white);bpy.ops.object.convert(target='MESH')
 rod('Tail wheel strut',(0,4.2,1.85),(0,4.2,.36),.09,metal)
 rod('Tail landing tire',(-.16,4.2,.36),(.16,4.2,.36),.36,black)
 # Tapered elevated tail, swept fin, horizontal stabilizer.
 tail=mesh('Tapered tail boom',[(-.6,4.15,2.15),(.6,4.15,2.15),(.6,4.15,3.25),(-.6,4.15,3.25),(-.2,11.8,3.2),(.2,11.8,3.2),(.2,11.8,3.75),(-.2,11.8,3.75)],[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],green)
 mesh('Swept tail fin',[(-.12,10.3,3.4),(-.12,11.6,6.05),(-.12,12.7,6.05),(-.12,12,3.3),(.12,10.3,3.4),(.12,11.6,6.05),(.12,12.7,6.05),(.12,12,3.3)],[(0,1,2,3),(4,7,6,5),(1,5,6,2),(0,4,5,1),(2,6,7,3)],green)
 box('Tail stabilizer',(0,9,3.75),(4.3,.7,.12),white)
 rod('Main rotor mast',(0,0,4.5),(0,0,5.55),.18,metal)
 rotor=empty('ArrivalRotor',(0,0,5.6),root)
 for i in range(5):
  a=i*math.tau/5;blade=empty('Blade assembly',(0,0,0),rotor);blade.rotation_euler.z=a
  rod('Pitch linkage',(.2,0,-.2),(1,0,0),.06,metal,blade)
  mesh('Tapered main blade',[(.8,-.18,0),(9.4,-.23,-.08),(9.6,.02,-.08),(1,.25,0)],[(0,1,2,3)],black,blade)
  box('Rotor warning tip',(9.18,-.06,-.08),(.4,.3,.035),gold,blade,0)
 rear=empty('ArrivalTailRotor',(.3,11.7,4.8),root)
 for i in range(5):
  a=i*math.tau/5;dy,dz=math.cos(a),math.sin(a)
  rod('Tail rotor blade',(0,dy*.2,dz*.2),(0,dy*1.25,dz*1.25),.09,black,rear)
 box('Door recess',(1.91,-.7,2.40),(.035,1.75,3.1),black)
 door=empty('ArrivalDoor',(1.96,-.7,2.40),root)
 box('Sliding door panel',(0,0,0),(.08,1.7,3.05),green,door)
 box('Door glazing',(.05,0,.62),(.03,.9,.73),glass,door)
 box('Door handle',(.10,-.4,-.05),(.08,.25,.06),metal,door)
 for i in range(3):box('Boarding step',(2.08+i*.27,-.7,.9-i*.25),(.7,1.25,.10),metal)
 for side in [-1,1]:rod('Stair handrail',(side*.45+2.2,-1.32,.95),(side*.45+2.2,-1.32,2.25),.035,metal)
 ell('Nose radar',(0,-4.72,1.38),(.62,.7,.45),green)
 rod('Nose antenna',(0,-4.3,1.1),(0,-4.85,.6),.03,black)
 ell('Red anti collision beacon',(0,1.5,4.83),(.13,.13,.14),red)
 for side in [-1,1]:ell('Navigation lamp',(side*2.4,1.1,1.6),(.10,.15,.08),red if side<0 else gold)
 bpy.ops.object.select_all(action='DESELECT')
 for o in scene.objects:o.select_set(True)
 path=BASE+'/public/models/arrival-helicopter.glb';bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False)
 bpy.data.libraries.write(BASE+'/assets/blender/arrival-helicopter.blend',{scene},fake_user=True)
 bpy.context.window.scene=old
 return {'path':path,'objects':len(scene.objects),'bytes':os.path.getsize(path)}
result=build()
