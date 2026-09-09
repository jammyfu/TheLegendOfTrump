"""Adventure recurve bow, quiver and fletched arrows, matching existing gold/navy assets."""
from pathlib import Path
exec(Path(__file__).with_name('build_enemies_arena.py').read_text().split("\nenemy('Sentinel');")[0])
from mathutils import Vector
def rod(name,a,b,r,m,parent):
 a,b=Vector(a),Vector(b);o=cylinder(name,(a+b)/2,r,(b-a).length,m,parent,vertices=8);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
bow=empty('BowRoot')
for sign in [-1,1]:
 pts=[(0,0,0),(0,-.14,sign*.25),(0,-.19,sign*.50),(0,-.04,sign*.72),(0,.12,sign*.84)]
 for i in range(len(pts)-1):rod('Recurve limb',pts[i],pts[i+1],.055 if i<2 else .038,'wood',bow)
 for h in [.22,.52,.77]:sphere('Gold limb binding',(0,-.13 if h<.6 else .03,sign*h),(.07,.075,.04),'gold',bow)
box('Leather bow grip',(0,0,0),(.13,.13,.25),'navy',bow)
export(bow,'adventure-bow.glb')
quiver=empty('QuiverRoot')
cylinder('Leather quiver',(0,0,0),.18,.85,'navy',quiver)
for h in [-.4,.35]:cylinder('Quiver gold rim',(0,0,h),.2,.07,'gold',quiver)
for i in range(5):
 x=(i%3-1)*.075;y=(i//3)*.07
 rod('Arrow shaft',(x,y,0),(x,y,.86),.014,'wood',quiver)
 box('Arrow fletching',(x,y,.72),(.10,.018,.18),'ivory',quiver,0)
export(quiver,'adventure-quiver.glb')
bpy.data.libraries.write(BASE+'/assets/blender/adventure-bow.blend',{scene},fake_user=True)
bpy.context.window.scene=original
