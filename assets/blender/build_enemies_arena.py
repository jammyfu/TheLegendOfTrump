"""Build the reference concept-sheet silhouettes and open-floor arena. Z-up, front -Y."""
import bpy, math, os
BASE=os.environ.get('TRUMP_PROJECT_DIR',os.path.abspath(os.path.join(os.path.dirname(__file__),'../..')))
scene=bpy.data.scenes.new('Trump_Enemy_Arena_Assets');original=bpy.context.window.scene;bpy.context.window.scene=scene
mats={}
def mat(name,c,metal=0,emission=0):
 rgb=[int(c[i:i+2],16)/255 for i in (0,2,4)];rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.65
 if emission:p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emission
 mats[name]=m
for n,c,metal,e in [('navy','263954',.3,0),('gold','bb9754',.55,0),('iron','222d33',.5,0),('ivory','e5d8bb',0,0),('red','6b2337',0,0),('cyan','44dfff',.2,1.4),('wood','66452d',0,0),('walnut','493025',0,0),('blueglass','87b9c8',.1,.25),('rug','1c314a',0,0),('leaf','385747',0,0),('lamp','ffdc94',0,1.2)]:mat(n,c,metal,e)
def empty(name,loc=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=parent;o.location=loc;return o
def box(name,loc,size,m,parent,bevel=.035):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Faceted chamfer','BEVEL');mod.width=bevel;mod.segments=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.data.materials.append(mats[m]);return o
def mesh(name,vs,fs,m,parent):
 d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.materials.append(mats[m]);d.update();o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.parent=parent;return o
def cylinder(name,loc,r,depth,m,parent,rot=(0,0,0),vertices=12):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.rotation_euler=rot;o.data.materials.append(mats[m]);return o
def sphere(name,loc,scale,m,parent):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=scale;o.data.materials.append(mats[m]);return o
def export(root,file):
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in root.children_recursive:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=BASE+'/public/models/'+file,export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False)
def enemy(prefix,boss=False):
 root=empty(prefix+'Root');root.scale=(1.40,)*3 if boss else (.90,)*3
 torso=empty(prefix+'Torso',(0,0,1.2),root)
 box(prefix+'Waist',(0,0,-.07),(.66,.47,.33),'iron',torso)
 box(prefix+'Belt',(0,-.02,.05),(.78,.55,.16),'gold',torso)
 box(prefix+'Breastplate',(0,0,.47),(.94,.60,.80),'navy',torso,.13)
 mesh(prefix+'Chest chevron',[(-.47,-.33,.63),(0,-.40,.19),(.47,-.33,.63),(.37,-.35,.72),(0,-.43,.34),(-.37,-.35,.72)],[(0,1,4,5),(1,2,3,4)],'gold',torso)
 head=empty(prefix+'Head',(0,0,1.04),torso)
 box(prefix+'Helmet',(0,0,0),(.58,.58,.62),'navy',head,.10)
 box(prefix+'Visor black',(0,-.31,.04),(.51,.04,.18),'iron',head)
 box(prefix+'Visor light',(0,-.34,.07),(.47,.02,.055),'cyan',head)
 box(prefix+'Helmet ridge',(0,-.33,-.12),(.065,.05,.3),'gold',head)
 for x in ([-.22,0,.22] if boss else [0]):box(prefix+'Crown',(x,0,.46),(.07,.16,.4 if x else .55),'gold',head)
 if boss:
  cylinder(prefix+'Core rim',(0,-.36,.57),.29,.11,'gold',torso,(math.pi/2,0,0))
  cylinder(prefix+'Core',(0,-.435,.57),.22,.055,'cyan',torso,(math.pi/2,0,0))
  mesh(prefix+'Cape',[(-.52,.30,.93),(.52,.30,.93),(.73,.52,-.99),(0,.64,-1.11),(-.73,.52,-.99)],[(0,1,2,3,4)],'red',torso)
 else:mesh(prefix+'Chest star',[(0,-.35,.8),(-.19,-.35,.51),(.19,-.35,.51)],[(0,1,2)],'gold',torso)
 for side,label in [(-1,'Right'),(1,'Left')]:
  arm=empty(prefix+label+'Arm',(side*.59,0,.68),torso)
  sphere(prefix+'Shoulder',(side*.02,0,-.04),(.35 if boss else .29,.36,.30),'gold' if boss else 'navy',arm)
  box(prefix+'Upper arm',(0,0,-.3),(.25,.28,.42),'navy',arm)
  elbow=empty(prefix+label+'Elbow',(0,0,-.52),arm);sphere(prefix+'Elbow ball',(0,0,0),(.16,)*3,'gold',elbow)
  box(prefix+'Forearm',(0,0,-.19),(.28,.31,.34),'navy',elbow)
  hand=empty(prefix+label+'Hand',(0,0,-.40),elbow);box(prefix+'Fist',(0,-.01,-.09),(.24,.30,.24),'iron',hand)
  leg=empty(prefix+label+'Leg',(side*.25,0,1.08),root)
  box(prefix+'Thigh',(0,0,-.22),(.34,.37,.48),'navy',leg)
  knee=empty(prefix+label+'Knee',(0,0,-.48),leg);sphere(prefix+'Knee cap',(0,-.17,0),(.2,.1,.19),'gold',knee)
  box(prefix+'Shin',(0,0,-.22),(.30,.32,.42),'navy',knee)
  box(prefix+'Boot',(0,-.12,-.48),(.39,.65,.23),'gold',knee)
  if label=='Right':
   weapon=empty(prefix+'Weapon',(0,-.18,-.08),hand)
   if boss:
    cylinder(prefix+'Hammer shaft',(0,0,.55),.055,1.75,'gold',weapon)
    box(prefix+'Hammer head',(0,0,1.35),(.85,.58,.58),'navy',weapon,.07)
    for x in [-.43,.43]:box(prefix+'Hammer end',(x,0,1.35),(.1,.65,.65),'gold',weapon)
   else:
    box(prefix+'Sword hilt',(0,0,0),(.40,.10,.10),'gold',weapon)
    mesh(prefix+'Sword blade',[(-.08,0,.08),(.08,0,.08),(.07,0,.98),(0,0,1.2),(-.07,0,.98),(0,-.035,.2)],[(0,1,5),(1,2,3,5),(0,5,3,4)],'ivory',weapon)
  elif not boss:
   mesh(prefix+'Shield',[(x,-.30,z) for x,z in [(-.36,.32),(0,.47),(.36,.32),(.30,-.25),(0,-.48),(-.30,-.25)]],[(0,1,2,3,4,5)],'gold',hand)
   mesh(prefix+'Shield face',[(x*.85,-.32,z*.85) for x,z in [(-.36,.32),(0,.47),(.36,.32),(.30,-.25),(0,-.48),(-.30,-.25)]],[(0,1,2,3,4,5)],'navy',hand)
 export(root,'iron-chancellor.glb' if boss else 'palace-sentinel.glb')
enemy('Sentinel');enemy('Boss',True)
room=empty('OvalArenaRoot')
def bx(n,x,y,z,w,h,d,m,b=.025):return box(n,(x,-z,y),(w,d,h),m,room,b)
bx('Walnut floor',0,-.16,0,18.6,.3,17.4,'wood')
for x in range(-8,9):bx('Floor plank seam',x,.006,0,.02,.008,17,'walnut',0)
cylinder('Arena carpet',(0,0,.03),5.45,.04,'rug',room,vertices=64)
for r in [5.18,5.3,1.4]:
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.04,major_segments=64,minor_segments=4);o=bpy.context.object;o.name='Carpet gold embroidery';o.parent=room;o.location.z=.058;o.data.materials.append(mats['gold'])
for i in range(16):
 a=i*math.tau/16;x,z=math.sin(a)*4.7,math.cos(a)*4.7
 vs=[(x+math.sin(j*math.pi/5)*(.17 if j%2==0 else .075),-z+math.cos(j*math.pi/5)*(.17 if j%2==0 else .075),.065) for j in range(10)]
 mesh('Rug star',vs,[tuple(range(10))],'gold',room)
bx('Rear ivory wall',0,4,-8,18,8,.5,'ivory')
bx('Entrance ivory wall',0,4,8.8,18,8,.4,'ivory')
bx('Entrance gold frame',0,2.3,8.55,2.9,4.6,.12,'gold')
bx('Entrance double doors',0,2.15,8.45,2.6,4.3,.12,'navy')
bx('Entrance central seam',0,2.15,8.36,.045,4.3,.03,'gold')
for side in [-1,1]:bx('Entrance handle',side*.16,2.0,8.32,.07,.35,.08,'gold')
for side in [-1,1]:
 bx('Paneled side wall',side*9,4,.4,.5,8,17.6,'ivory')
 for z in [-6,-3,0,3,6]:
  bx('Wall inset panel',side*8.72,2,z,.04,2.8,2.5,'wood')
  bx('Panel inner',side*8.68,2,z,.03,2.45,2.2,'ivory')
  cylinder('Sconce stem',(side*8.45,-z,3.8),.08,.7,'gold',room)
  sphere('Sconce glow',(side*8.45,-z,4.2),(.13,.13,.25),'lamp',room)
 for z in [-5,5]:
  bx('Bookcase frame',side*7.85,1.8,z,1.2,3.6,1.8,'walnut')
  for h in [.6,1.4,2.2,3]:
   bx('Bookcase shelf',side*7.2,h,z,.12,.08,1.8,'gold')
   for k in range(7):bx('Leather book',side*7.17,h+.28,z-.68+k*.21,.14,.43,.14,'red' if k%2 else 'navy')
 for z in [-6.8,6.8]:
  cylinder('Column',(side*7.6,-z,3.6),.30,7.2,'ivory',room)
  cylinder('Column base',(side*7.6,-z,.18),.45,.35,'gold',room)
 bx('Sofa seat',side*6,.6,1,2,1.2,3.7,'ivory')
 bx('Sofa back',side*6.8,1.3,1,.4,1.1,3.7,'ivory')
 for z in [-.7,2.7]:bx('Sofa arm',side*6,1,z,2,.4,.2,'gold')
 for z in [0,1,2]:bx('Sofa cushion',side*6,.98,z,1.4,.3,.9,'ivory',.09)
for x in [-6,-3,0,3,6]:
 bx('Tall blue window',x,4.35,-7.68,2.0,5.8,.10,'blueglass')
 for sx in [-1,1]:
  bx('Window jamb',x+sx*1.07,4.3,-7.55,.12,6.0,.22,'gold')
  for k in range(3):bx('Pleated burgundy curtain',x+sx*(1.16+k*.10),4.0,-7.4,.14,6.0,.25,'red')
 bx('Window mullion',x,4.3,-7.52,.07,5.8,.14,'ivory')
 for h in [2,3.3,4.6,5.9,7.3]:bx('Window crossbar',x,h,-7.52,2.2,.08,.14,'ivory')
 bx('Curtain valance',x,7.4,-7.37,2.8,.45,.3,'red')
for y in [.3,7.6]:
 bx('Rear cornice',0,y,-7.6,18,.18,.22,'gold')
 for side in [-1,1]:bx('Side cornice',side*8.6,y,0,.22,.18,16,'gold')
bx('Presidential desk',0,1,-5,5.7,2,1.9,'walnut')
bx('Carved desk top',0,2.04,-5,6.2,.23,2.35,'wood')
for x in [-2.2,-1.1,0,1.1,2.2]:
 bx('Desk gold panel',x,1,-3.99,.87,1.4,.08,'gold');bx('Desk inset',x,1,-3.93,.65,1.14,.08,'wood')
bx('Chair',0,1.3,-6.3,1.5,2.6,.4,'red')
bx('Declaration',0,2.2,-4.65,1.4,.04,.9,'ivory')
bx('Pen',.6,2.24,-4.65,.06,.04,.8,'gold')
bx('Desk lamp base',2,2.25,-5,.6,.15,.5,'gold')
cylinder('Lamp stem',(2,5,2.7),.07,.8,'gold',room)
sphere('Desk lamp shade',(2,5,3.1),(.45,.3,.2),'lamp',room)
bpy.ops.object.select_all(action='DESELECT')
room_meshes=[o for o in room.children_recursive if o.type=='MESH']
# Expand architecture and circulation space without enlarging furniture/people.
for o in room_meshes:
 if o.name.startswith(('Presidential desk','Carved desk','Desk','Chair','Declaration','Pen','Lamp stem')):
  o.location.y += 3.25
 elif o.name.startswith(('Bookcase','Leather book')):
  o.location.x += math.copysign(7.85*.65,o.location.x)
  o.location.y += math.copysign(5*.65,o.location.y)
 elif o.name.startswith('Sofa'):
  o.location.x += math.copysign(6*.65,o.location.x)
  o.location.y -= .65
 else:
  o.location.x *= 1.65;o.location.y *= 1.65
  o.scale.x *= 1.65;o.scale.y *= 1.65
 o.select_set(True)
bpy.context.view_layer.objects.active=room_meshes[0];bpy.ops.object.join();room_meshes[0].name='OvalArenaGeometry'
export(room,'oval-arena.glb')
bpy.data.libraries.write(BASE+'/assets/blender/enemies-arena.blend',{scene},fake_user=True)
bpy.context.window.scene=original
result={'models':['palace-sentinel.glb','iron-chancellor.glb','oval-arena.glb']}
