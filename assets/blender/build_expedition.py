"""Add readable archer/heavy silhouettes and reusable outdoor camps via Blender MCP."""
from pathlib import Path
exec(Path(__file__).with_name('build_enemies_arena.py').read_text().split("\nenemy('Sentinel');")[0])
from mathutils import Vector
saved_export=export
export=lambda *args:None
# Reuse authored joint coordinates, but export distinct equipment and silhouettes.
def rod(n,a,b,r,m,p):
 a,b=Vector(a),Vector(b);o=cylinder(n,(a+b)/2,r,(b-a).length,m,p,vertices=8);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def build_variant(kind):
 enemy('Sentinel')
 root=next(o for o in scene.objects if o.name=='SentinelRoot')
 get=lambda n:next(o for o in root.children_recursive if o.name=='Sentinel'+n)
 weapon=get('Weapon')
 for o in list(weapon.children_recursive):bpy.data.objects.remove(o,do_unlink=True)
 if kind=='archer':
  mat('ranger','416a55');mat('leather','76553d')
  for o in root.children_recursive:
   if o.type=='MESH':
    for i,m in enumerate(o.data.materials):
     if m.name=='navy':o.data.materials[i]=mats['ranger']
   if o.name.startswith(('SentinelShield','SentinelCrown')):bpy.data.objects.remove(o,do_unlink=True)
  hand=get('LeftHand');bow=empty('ArcherBow',(0,-.20,0),hand)
  for sign in [-1,1]:
   points=[(0,0,0),(0,-.20,sign*.4),(0,-.16,sign*.75),(0,.03,sign*.95)]
   for a,b in zip(points,points[1:]):rod('Recurve bow limb',a,b,.045,'wood',bow)
  rod('Bowstring',(0,.03,-.95),(0,.03,.95),.009,'ivory',bow)
  box('Bow grip',(0,0,0),(.12,.12,.23),'leather',bow)
  head=get('Head');mesh('Ranger hood',[(-.37,.32,-.2),(.37,.32,-.2),(-.37,-.35,.25),(.37,-.35,.25),(0,.05,.6)],[(0,1,4),(0,4,2),(1,3,4)],'ranger',head)
  torso=get('Torso');cylinder('Archer quiver',(.28,.4,.30),.17,.85,'leather',torso)
  for k in range(4):
   x=.18+k*.065;rod('Quiver arrow',(x,.40,.2),(x,.40,1.02),.013,'wood',torso);box('White fletching',(x,.40,.93),(.09,.015,.14),'ivory',torso,0)
 else:
  mat('crimson','814139')
  for o in root.children_recursive:
   if o.type=='MESH':
    for i,m in enumerate(o.data.materials):
     if m.name=='navy':o.data.materials[i]=mats['crimson']
  root.scale=(1.04,)*3
  for side,label in [(-1,'Right'),(1,'Left')]:box('Heavy shoulder plate',(side*.08,0,.03),(.65,.67,.30),'iron',get(label+'Arm'))
  cylinder('Heavy hammer grip',(0,0,.48),.065,1.35,'wood',weapon)
  box('Heavy hammer head',(0,0,1.12),(.75,.48,.44),'iron',weapon)
  for x in [-.38,.38]:box('Hammer brass cap',(x,0,1.12),(.09,.52,.48),'gold',weapon)
 saved_export(root,'field-'+kind+'.glb')
 # Retain each source rig in its own collection, free object names for the next variant.
 for o in [root,*root.children_recursive]:o.name=kind+'_'+o.name
build_variant('archer');build_variant('brute')
camp=empty('FieldCampRoot')
# Coordinates below are Blender X,-worldZ,height, with a clear circulation gap.
mesh('Canvas tent',[(-5,2,0),(-1,2,0),(-3,2,3.2),(-5,-2,0),(-1,-2,0),(-3,-2,3.2)],[(0,2,5,3),(2,1,4,5),(0,1,2)],'leaf',camp)
for x in [-5,-1]:rod('Tent frame',(x,2,0),(-3,2,3.2),.045,'wood',camp)
rod('Tent ridge',(-3,-2,3.2),(-3,2,3.2),.055,'wood',camp)
for x in [2.5,3.5,4.5,5.5]:
 box('Barricade post',(x,-2,.75),(.30,.6,1.5),'wood',camp)
for h in [.5,1.2]:box('Barricade crossbar',(4,-2,h),(3,.25,.16),'gold',camp)
rod('Camp standard',(2,1,0),(2,1,4),.06,'gold',camp)
mesh('Camp banner',[(2,1,3.8),(3.4,1,3.8),(3.4,1,2.5),(2.7,1,2.25),(2,1,2.5)],[(0,1,2,3,4)],'red',camp)
cylinder('Lantern stand',(0,0,.20),.3,.4,'iron',camp)
sphere('Lantern warm glass',(0,0,.5),(.22,.22,.32),'lamp',camp)
saved_export(camp,'field-camp.glb')
bpy.data.libraries.write(BASE+'/assets/blender/expedition.blend',{scene},fake_user=True)
bpy.context.window.scene=original
result={'assets':['field-archer.glb','field-brute.glb','field-camp.glb']}
