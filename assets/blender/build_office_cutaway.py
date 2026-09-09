"""Build an independent cutaway variant; retain the original arena and enemy assets.

Run through Blender MCP in a background process with this repository's
enemies-arena.blend as input. Source furniture remains at its original scale.
"""
from pathlib import Path
import bpy

PROJECT = Path(__file__).resolve().parents[2]
source = (PROJECT / 'assets/blender/build_enemies_arena.py').read_text()
scope = {'__file__': str(PROJECT / 'assets/blender/build_enemies_arena.py')}
# Reuse the source construction without executing enemy export or the final join.
exec(source.split("enemy('Sentinel');")[0], scope)
room_source = 'room=empty' + source.split('room=empty', 1)[1]
exec(room_source.split('bpy.context.view_layer.objects.active=room_meshes[0]')[0], scope)
room, scene, bx = scope['room'], scope['scene'], scope['bx']

def wall_group(o):
    n = o.name
    if n.startswith('Ceiling'): return 'ceiling'
    if n.startswith('Upper end'): return 'back' if o.location.y > 0 else 'front'
    if n.startswith(('Rear ivory', 'Tall blue', 'Window', 'Pleated', 'Curtain', 'Rear cornice')):
        return 'back'
    if n.startswith('Entrance'):
        return 'front'
    if n.startswith(('Paneled side', 'Wall inset', 'Panel inner', 'Panel rail', 'Panel stile',
                     'Portrait', 'Sconce', 'Side cornice', 'Layered upper', 'Upper clerestory')):
        return 'west' if o.location.x < 0 else 'east'
    return 'furnishing'

groups = {key: [] for key in ['back', 'front', 'west', 'east', 'ceiling', 'furnishing']}
for obj in list(room.children_recursive):
    if obj.type == 'MESH': groups[wall_group(obj)].append(obj)

# Derive dimensions from the current source room so expansion stays in sync.
horizontal = max(abs(o.location.x) for o in groups['east']) / 14.85
roof_height = max(o.location.z + o.dimensions.z / 2 for o in groups['east'])
def detail(group, name, x, y, z, w, h, d, material):
    if group == 'ceiling': y += max(0, roof_height - 8)
    obj = bx(name, x * horizontal, y, z * horizontal, w * horizontal, h, d * horizontal, material)
    groups[group].append(obj)
    return obj

# A complete overhead shell with recessed coffers, trim and a central lantern.
detail('ceiling', 'Coffered ceiling', 0, 8.17, .66, 30.1, .25, 28.3, 'ivory')
for x in [-14, -7, 0, 7, 14]:
    detail('ceiling', 'Ceiling longitudinal beam', x, 7.94, .66, .28, .32, 27.7, 'ivory')
    detail('ceiling', 'Beam gilt edge', x, 7.77, .66, .32, .035, 27.7, 'gold')
for z in [-12.8, -6.1, .66, 7.4, 14.1]:
    detail('ceiling', 'Ceiling cross beam', 0, 7.94, z, 28.2, .32, .28, 'ivory')
    detail('ceiling', 'Cross beam gilt edge', 0, 7.77, z, 28.2, .035, .32, 'gold')
detail('ceiling', 'Lantern suspension', 0, 7.3, .66, .08, 1.2, .08, 'gold')
detail('ceiling', 'Lantern warm glass', 0, 6.6, .66, 1.1, .75, 1.1, 'lamp')
for x in [-.6, .6]:
    for z in [.06, 1.26]:
        detail('ceiling', 'Lantern corner', x, 6.6, z, .065, .9, .065, 'gold')
for y in [6.14, 7.06]:
    detail('ceiling', 'Lantern cap', 0, y, .66, 1.35, .08, 1.35, 'gold')

# Entrance transom and matching panel rhythm make the reverse view complete.
detail('front', 'Entrance transom frame', 0, 5.65, 13.95, 5.4, 1.45, .2, 'gold')
detail('front', 'Entrance transom glass', 0, 5.65, 13.81, 5.08, 1.12, .12, 'blueglass')
for x in [-1.7, 0, 1.7]:
    detail('front', 'Entrance transom mullion', x, 5.65, 13.71, .08, 1.2, .12, 'ivory')
for x in [-11, -7, 7, 11]:
    detail('front', 'Gallery gilt panel', x, 3.5, 14.03, 2.7, 4.8, .16, 'gold')
    detail('front', 'Gallery ivory inset', x, 3.5, 13.92, 2.45, 4.55, .12, 'ivory')
    detail('front', 'Gallery burgundy plaque', x, 4.9, 13.83, 1.7, 1.15, .10, 'red')
for side, x in ([] if any(o.name.startswith('Portrait') for o in room.children_recursive) else [('west', -14.16), ('east', 14.16)]):
    for z in [-4.4, 4.4]:
        detail(side, 'Upper gallery frame', x, 5.9, z, .14, 2.2, 3.2, 'gold')
        detail(side, 'Upper gallery inset', x + (.1 if x < 0 else -.1), 5.9, z, .1, 1.98, 2.98, 'navy')

for key, objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = 'OfficeFurnishing' if key == 'furnishing' else 'OfficeCutaway_' + key
    if key != 'furnishing': joined['cutaway'] = key

scope['export'](room, 'oval-cutaway.glb')
bpy.data.libraries.write(str(PROJECT / 'assets/blender/office-cutaway.blend'), {scene}, fake_user=True)
result = {'asset': str(PROJECT / 'public/models/oval-cutaway.glb'), 'groups': list(groups)}
