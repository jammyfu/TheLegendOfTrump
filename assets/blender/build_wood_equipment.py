"""Closed, lightweight starter equipment, using the existing wrist origins."""
from pathlib import Path
import bpy

def build():
    previous = bpy.context.window.scene
    source = Path(__file__).with_name('build_adventure_props.py')
    scope = {'__file__': str(source)}
    try:
        exec(source.read_text().split("sword=empty('GearSword')")[0], scope)
        empty, box, export = (scope[k] for k in ('empty', 'box', 'export'))
        sword = empty('WoodSword')
        box('Oak blade', (0, 0, .83), (.18, .095, 1.28), 'woodlight', sword, .04)
        box('Oak guard', (0, 0, .15), (.51, .15, .13), 'wood', sword)
        box('Leather grip', (0, 0, -.075), (.12, .13, .32), 'wood', sword)
        for z in [-.18, -.10, -.02]:
            box('Grip binding', (0, 0, z), (.135, .145, .025), 'woodlight', sword, .008)
        export(sword, 'wood-sword.glb')
        shield = empty('WoodShield')
        for index in range(5):
            x = (index - 2) * .18
            height = [ .72, .94, 1.04, .94, .72 ][index]
            box('Oak shield plank', (x, -.06, 0), (.177, .13, height),
                'woodlight' if index % 2 else 'wood', shield, .025)
        for z in [-.25, .25]:
            box('Rear brace', (0, .04, z), (.82, .08, .10), 'wood', shield)
        box('Leather arm strap', (0, .12, 0), (.32, .09, .12), 'wood', shield)
        export(shield, 'wood-shield.glb')
        bpy.data.libraries.write(scope['BASE']+'/assets/blender/wood-equipment.blend', {scope['scene']}, fake_user=True)
    finally:
        bpy.context.window.scene = previous

build()
result = {'models': ['wood-sword.glb', 'wood-shield.glb']}
