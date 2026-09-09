"""Blender MCP source: independent equipment and interactive prop models."""
import bpy,math,os
BASE=os.environ.get('TRUMP_PROJECT_DIR','/Users/jammyfu/works/AI/PersonalProject/TheLegendOfTrump')
previous=bpy.context.window.scene
scene=bpy.data.scenes.new('Trump_Adventure_Props');bpy.context.window.scene=scene
materials={}
def material(name,hex):
 c=[int(hex[i:i+2],16)/255 for i in (0,2,4)];c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]
 m=bpy.data.materials.new('Adventure_'+name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.65;materials[name]=m
for n,c in [('steel','b8c9d0'),('edge','e3e8dd'),('blue','152a91'),('red','ab2b32'),('gold','c8a349'),('wood','73502e'),('woodlight','a07b49'),('iron','334448'),('green','65984a'),('pale','c2de74')]:material(n,c)
def empty(name,loc=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.location=loc;o.parent=parent;return o
def mesh(name,vs,fs,mat,parent):
 d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.materials.append(materials[mat]);d.update();o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.parent=parent;return o
def box(name,loc,scale,mat,parent,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  m=o.modifiers.new('Faceted_edges','BEVEL');m.width=bevel;m.segments=1;bpy.ops.object.modifier_apply(modifier=m.name)
 o.data.materials.append(materials[mat]);return o
def export(root,filename):
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in root.children_recursive:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=BASE+'/public/models/'+filename,export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False)
sword=empty('GearSword')
box('Wrapped_blue_grip',(0,0,-.06),(.11,.13,.36),'blue',sword)
box('Gold_pommel',(0,0,-.27),(.18,.17,.12),'gold',sword)
mesh('Winged_crossguard',[(-.39,0,.14),(-.19,-.03,.24),(0,-.045,.17),(.19,-.03,.24),(.39,0,.14),(.3,.025,.03),(0,.025,.09),(-.3,.025,.03)],[(0,1,2,6,7),(2,3,4,5,6)],'blue',sword)
mesh('Silver_blade',[(-.10,0,.23),(.10,0,.23),(.09,0,1.4),(0,0,1.75),(-.09,0,1.4),(0,-.045,.23),(0,-.03,1.4),(0,.045,.23),(0,.03,1.4)],[(0,5,6,4),(5,1,2,6),(4,6,3),(6,2,3),(1,7,8,2),(7,0,4,8),(2,8,3),(8,4,3)],'steel',sword)
export(sword,'hero-sword.glb')
shield=empty('GearShield')
outline=[(-.48,.45),(0,.66),(.48,.45),(.46,-.1),(.3,-.43),(0,-.7),(-.3,-.43),(-.46,-.1)]
vs=[(x,-.07,z) for x,z in outline]+[(x*.83,-.13,z*.83) for x,z in outline]
mesh('Shield_metal_rim',vs,[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)],'steel',shield)
mesh('Shield_blue_face',[(x*.83,-.12,z*.83) for x,z in outline]+[(0,-.22,0)],[(i,(i+1)%8,8) for i in range(8)],'blue',shield)
mesh('Shield_back',[(x,.025,z) for x,z in outline],[tuple(reversed(range(8)))],'iron',shield)
for s in [-1,1]:
 for i in range(3):mesh('Crimson_wing',[(s*.045,-.234,-.05-i*.08),(s*(.32-i*.05),-.21,.03-i*.17),(s*.08,-.237,-.15-i*.09)],[(0,1,2)],'red',shield)
mesh('Golden_crest',[(0,-.234,.38),(-.13,-.222,.18),(.13,-.222,.18)],[(0,1,2)],'gold',shield)
box('Arm_strap',(0,.095,0),(.3,.12,.12),'wood',shield)
export(shield,'hero-shield.glb')
chest=empty('AdventureChest');box('Chest_body',(0,0,.35),(1.5,1,.7),'wood',chest)
for x in [-.56,.56]:box('Chest_band',(x,0,.36),(.11,1.06,.76),'iron',chest)
lid=empty('LidPivot',(0,.45,.72),chest)
box('Chest_lid',(0,-.45,.13),(1.53,1.03,.3),'woodlight',lid,.1)
for x in [-.56,.56]:box('Lid_band',(x,-.45,.18),(.12,1.08,.28),'gold',lid)
box('Chest_lock',(0,-.56,.63),(.21,.09,.27),'gold',chest)
export(chest,'adventure-chest.glb')
lever=empty('AdventureLever');box('Stone_base',(0,0,.22),(.85,.85,.44),'iron',lever,.09);box('Lever_support',(0,0,.62),(.3,.3,.55),'steel',lever)
h=empty('HandlePivot',(0,0,.76),lever);box('Lever_handle',(0,0,.26),(.12,.12,.6),'wood',h);box('Lever_grip',(0,0,.59),(.35,.2,.18),'red',h)
export(lever,'adventure-lever.glb')
crate=empty('AdventureCrate');box('Crate_body',(0,0,.7),(1.4,1.4,1.4),'wood',crate)
for a in [-.57,.57]:
 box('Crate_front_band',(a,-.72,.7),(.15,.07,1.4),'woodlight',crate);box('Crate_side_band',(-.72,a,.7),(.07,.15,1.4),'woodlight',crate)
for z in [.14,1.26]:box('Crate_cross_band',(0,-.74,z),(1.4,.1,.14),'woodlight',crate)
export(crate,'adventure-crate.glb')
herb=empty('AdventureHerb')
for i in range(7):
 a=i*math.pi*2/7;x=math.sin(a);y=math.cos(a)
 mesh('Herb_leaf',[(0,0,.1),(x*.5-y*.1,y*.5+x*.1,.25),(x*.56,y*.56,.7),(x*.35+y*.1,y*.35-x*.1,.3)],[(0,1,2),(0,2,3)],'green' if i%2 else 'pale',herb)
export(herb,'adventure-herb.glb')
bpy.data.libraries.write(BASE+'/assets/blender/adventure-props.blend',{scene},fake_user=True)
bpy.context.window.scene=previous
result={'models':['hero-sword.glb','hero-shield.glb','adventure-chest.glb','adventure-lever.glb','adventure-crate.glb','adventure-herb.glb'],'saved':BASE+'/assets/blender/adventure-props.blend'}
