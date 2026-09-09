"""Small reusable four-bladed throwing star; preserve the user's active scene."""
import bpy, math
from pathlib import Path
BASE=Path('/Users/jammyfu/works/AI/PersonalProject/TheLegendOfTrump')
def build():
 original=bpy.context.window.scene
 scene=bpy.data.scenes.new('Boss_Throwing_Star')
 try:
  bpy.context.window.scene=scene
  verts=[]
  for z in [-.045,.045]:
   for i in range(8):
    a=i*math.pi/4;r=.42 if i%2==0 else .14
    verts.append((math.cos(a)*r,math.sin(a)*r,z))
  faces=[tuple(reversed(range(8))),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
  mesh=bpy.data.meshes.new('FourBladedStar');mesh.from_pydata(verts,[],faces);mesh.update()
  steel=bpy.data.materials.new('Dart_Steel');steel.diffuse_color=(.56,.72,.78,1);steel.use_nodes=True
  bsdf=steel.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=steel.diffuse_color;bsdf.inputs['Metallic'].default_value=.7;bsdf.inputs['Roughness'].default_value=.32
  mesh.materials.append(steel)
  obj=bpy.data.objects.new('BossDart',mesh);scene.collection.objects.link(obj)
  bpy.ops.export_scene.gltf(filepath=str(BASE/'public/models/boss-dart.glb'),export_format='GLB',use_active_scene=True)
  bpy.data.libraries.write(str(BASE/'assets/blender/boss-dart.blend'),{scene})
  return {'vertices':len(verts),'faces':len(faces),'path':str(BASE/'public/models/boss-dart.glb')}
 finally:
  bpy.context.window.scene=original
result=build()
