"""Run through Blender MCP: repair the shared chest without touching other scenes.

Exports output/chest-repaired.glb. Run scripts/package-chest.mjs afterwards.
The current scene and selection are preserved; the repair scene stays inspectable.
"""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]


def shell(x, y, bottom, top, thickness, inverted=False):
    # Four rectangular rings: outside base/rim, inside rim/base.
    levels = [(x, y, bottom), (x, y, top),
              (x-thickness, y-thickness, top),
              (x-thickness, y-thickness, bottom+thickness)]
    vertices = [(a*sx, b*sy, bottom+top-z if inverted else z)
                for a, b, z in levels
                for sx, sy in [(-1,-1), (1,-1), (1,1), (-1,1)]]
    faces = [(3,2,1,0), (12,13,14,15)]
    for first, second in [(0,4), (4,8), (8,12)]:
        for i in range(4):
            j = (i+1) % 4
            faces.append((first+i, first+j, second+j, second+i))
    if inverted:
        faces = [tuple(reversed(f)) for f in faces]
    return vertices, faces


def boxes(bounds):
    vertices, faces = [], []
    for x0,x1,y0,y1,z0,z1 in bounds:
        offset = len(vertices)
        vertices.extend([(x,y,z) for z in [z0,z1]
                         for x,y in [(x0,y0),(x1,y0),(x1,y1),(x0,y1)]])
        faces.extend(tuple(offset+i for i in f) for f in
                     [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),
                      (2,3,7,6),(3,0,4,7)])
    return vertices, faces


def replace_mesh(obj, geometry):
    vertices, faces = geometry
    inverse = obj.matrix_world.inverted()
    mesh = bpy.data.meshes.new(obj.name + '_Hollow')
    mesh.from_pydata([inverse @ Vector(v) for v in vertices], [], faces)
    mesh.update()
    for material in obj.data.materials:
        mesh.materials.append(material)
    obj.data = mesh
    # Explicit metric face UVs also cover the inner walls and underside.
    uv = mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        axis = max(range(3), key=lambda a: abs(polygon.normal[a]))
        axes = [(1,2),(0,2),(0,1)][axis]
        for loop in polygon.loop_indices:
            p = obj.matrix_world @ mesh.vertices[mesh.loops[loop].vertex_index].co
            uv.data[loop].uv = (p[axes[0]], p[axes[1]])


def repair_chest():
    previous = bpy.context.window.scene
    scene = bpy.data.scenes.new('Chest_Hollow_Source')
    try:
        bpy.context.window.scene = scene
        bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/adventure-chest.glb'))
        bpy.context.view_layer.update()
        for obj in scene.objects:
            name = obj.name
            if name.startswith('Chest_body'):
                replace_mesh(obj, shell(.75,.5,0,.7,.1))
            elif name.startswith('Chest_lid'):
                replace_mesh(obj, shell(.765,.515,.7,1,.07, inverted=True))
            elif name.startswith('Chest_band'):
                x = obj.matrix_world.translation.x
                replace_mesh(obj, boxes([
                    (x-.055,x+.055,-.53,.53,-.02,.02),
                    (x-.055,x+.055,-.53,-.47,.02,.70),
                    (x-.055,x+.055,.47,.53,.02,.70)]))
            elif name.startswith('Lid_band'):
                x = obj.matrix_world.translation.x
                replace_mesh(obj, boxes([
                    (x-.06,x+.06,-.54,.54,.98,1.04),
                    (x-.06,x+.06,-.54,-.495,.76,.98),
                    (x-.06,x+.06,.495,.54,.76,.98)]))
        output = ROOT/'output/chest-repaired.glb'
        output.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB',
                                  use_active_scene=True, export_animations=False)
        return {'path':str(output), 'scene':scene.name,
                'objects':len(scene.objects), 'wallThickness':.1,
                'cavityDimensions':[1.3,.8,.6]}
    finally:
        bpy.context.window.scene = previous


result = repair_chest()
