"""Build the video-reference low-poly character in an isolated Blender scene.
Run through Blender MCP; main entry is explicit. Blender Z-up, front -Y.
"""
import bpy, math, os
from mathutils import Vector
BASE=os.environ.get('TRUMP_PROJECT_DIR','/Users/jammyfu/works/AI/PersonalProject/TheLegendOfTrump')

def build():
    original=bpy.context.window.scene
    scene=bpy.data.scenes.new('Trump_Video_Character')
    bpy.context.window.scene=scene
    mats={}
    def mat(name,hexcode):
        srgb=tuple(int(hexcode[i:i+2],16)/255 for i in (0,2,4))
        rgb=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in srgb)
        m=bpy.data.materials.new('Trump_'+name);m.diffuse_color=(*rgb,1);m.use_nodes=True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*rgb,1)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.93
        mats[name]=m;return m
    for n,c in [('suit','0b1237'),('suitlight','111d45'),('lapel','172044'),('skin','cc913e'),('skinlight','dfa34f'),('skinshade','ae762f'),('hair','cf9f19'),('hairlight','e5b62a'),('hairshade','a87b10'),('brow','76501c'),('white','e2e2da'),('blue','253478'),('black','101011'),('tie','b40910'),('tiehighlight','d71417'),('mouth','765027'),('silver','aab5bd'),('steel','d3dedf'),('hilt','243790')]:mat(n,c)
    def empty(name,loc=(0,0,0),parent=None):
        o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.location=loc;o.parent=parent;return o
    root=empty('TrumpRoot')
    body=empty('TorsoPivot',parent=root)
    head=empty('HeadPivot',(0,0,2.18),body)
    limbs={}
    for s,label in [(-1,'Left'),(1,'Right')]:
        limbs[label+'Arm']=empty(label+'ArmPivot',(s*.55,0,1.98),body)
        limbs[label+'Leg']=empty(label+'LegPivot',(s*.27,0,1.06),root)
    objects=[]
    def mesh(name,verts,faces,material,parent=None):
        data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.materials.append(mats[material]);data.update()
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.parent=parent or root;objects.append(obj);return obj
    def ringmesh(name,rings,material,parent=None,segments=8):
        # ring=(z, halfwidth, halfdepth, xcenter, ycenter); front is -Y.
        verts=[]
        for z,w,d,x,y in rings:
            for i in range(segments):
                a=2*math.pi*i/segments+math.pi/8
                verts.append((x+math.sin(a)*w,y-math.cos(a)*d,z))
        faces=[tuple(reversed(range(segments)))]
        for j in range(len(rings)-1):
            for i in range(segments):
                a=j*segments+i;b=j*segments+(i+1)%segments;c=b+segments;d=a+segments
                if j%2==0:faces.extend([(a,b,c),(a,c,d)])
                else:faces.append((a,b,c,d))
        faces.append(tuple(range((len(rings)-1)*segments,len(rings)*segments)))
        return mesh(name,verts,faces,material,parent)
    def poly(name,points,material,parent=None):return mesh(name,points,[tuple(range(len(points)))],material,parent)
    def bevelbox(name,loc,scale,material,parent=None,bevel=.04):
        bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,0));o=bpy.context.object;o.name=name;o.parent=parent or root;o.location=loc;o.scale=scale
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        if bevel:
            mod=o.modifiers.new('Angular_Edges','BEVEL');mod.width=bevel;mod.segments=1
            bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        o.data.materials.append(mats[material]);objects.append(o);return o
    # Broad tailored shoulders, a pinched waist and flared jacket hem; no block torso.
    ringmesh('Navy_Tailored_Jacket',[(.94,.52,.28,0,0),(1.23,.46,.27,0,0),(1.67,.47,.28,0,0),(2.01,.6,.28,0,.015),(2.12,.28,.21,0,0)],'suit',body)
    ringmesh('Neck',[(2.01,.17,.17,0,0),(2.28,.2,.17,0,0)],'skin',body)
    poly('Shirt_Front',[(-.24,-.263,2.1),(.24,-.263,2.1),(.14,-.3,1.6),(0,-.305,1.37),(-.14,-.3,1.6)],'white',body)
    poly('Lapel_Left',[(-.53,-.24,1.99),(-.24,-.284,2.1),(-.11,-.324,1.62),(-.33,-.294,1.77),(-.26,-.294,1.83)],'lapel',body)
    poly('Lapel_Right',[(.53,-.24,1.99),(.24,-.284,2.1),(.11,-.324,1.62),(.33,-.294,1.77),(.26,-.294,1.83)],'suitlight',body)
    poly('Shirt_Collar_L',[(-.24,-.289,2.11),(-.01,-.326,2.055),(-.15,-.337,1.92)],'white',body)
    poly('Shirt_Collar_R',[(.24,-.289,2.11),(.01,-.326,2.055),(.15,-.337,1.92)],'white',body)
    poly('Tie_Knot',[(-.083,-.345,2.066),(.067,-.345,2.066),(.103,-.346,1.984),(0,-.362,1.9),(-.09,-.349,1.985)],'tiehighlight',body)
    poly('Red_Tie',[(-.045,-.343,1.94),(.048,-.343,1.94),(.12,-.349,1.28),(0,-.36,1.15),(-.115,-.349,1.28)],'tie',body)
    # Flag lapel pin, like the reference.
    bevelbox('Flag_Pin',(.34,-.288,1.94),(.17,.016,.105),'white',body,0)
    for i in range(4):bevelbox('Pin_Stripe_%d'%i,(.34,-.301,1.902+i*.027),(.17,.005,.013),'tie',body,0)
    bevelbox('Pin_Canton',(.296,-.309,1.965),(.08,.006,.055),'blue',body,0)
    for s,label in [(-1,'Left'),(1,'Right')]:
        arm=limbs[label+'Arm'];leg=limbs[label+'Leg']
        ringmesh(label+'_Sleeve',[(0,.205,.205,0,0),(-.32,.16,.17,s*.15,0),(-.71,.16,.17,s*.29,-.01)],'suit',arm)
        ringmesh(label+'_Cuff',[(-.72,.14,.14,s*.29,-.01),(-.76,.14,.14,s*.3,-.01)],'white',arm)
        ringmesh(label+'_Fist',[(-.73,.125,.13,s*.31,-.02),(-.85,.205,.205,s*.35,-.045),(-1.03,.19,.17,s*.37,-.06),(-1.13,.11,.12,s*.32,-.045)],'skinlight',arm,segments=7)
        ringmesh(label+'_Thumb',[(-.8,.08,.08,s*.19,-.13),(-.99,.085,.09,s*.17,-.18),(-1.04,.05,.065,s*.18,-.14)],'skin',arm,segments=5)
        ringmesh(label+'_Trousers',[(0,.235,.235,0,0),(-.42,.21,.21,s*.065,0),(-.79,.245,.235,s*.12,-.01)],'suit',leg)
        bevelbox(label+'_Shoe',(s*.125,-.135,-.91),(.49,.75,.28),'black',leg,.055)
    # Faceted broad face with cheek planes and a protruding jaw.
    face_rings=[(.03,.235,.25),(.13,.33,.29),(.33,.37,.31),(.57,.36,.295),(.75,.31,.27),(.82,.23,.24)]
    face_vertices=[]
    for z,w,d in face_rings:
        face_vertices.extend([(-w*.8,-d,z),(w*.8,-d,z),(w,-d*.4,z),(w,d*.5,z),(w*.7,d,z),(-w*.7,d,z),(-w,d*.5,z),(-w,-d*.4,z)])
    face_faces=[tuple(reversed(range(8)))]
    for r in range(len(face_rings)-1):
        for i in range(8):face_faces.append((r*8+i,r*8+(i+1)%8,(r+1)*8+(i+1)%8,(r+1)*8+i))
    face_faces.append(tuple(range(40,48)))
    mesh('Head_Faceted',face_vertices,face_faces,'skinlight',head)
    for s,label in [(-1,'Left'),(1,'Right')]:
        ringmesh(label+'_Ear',[(.18,.08,.075,s*.355,.0),(.3,.105,.08,s*.38,-.005),(.4,.06,.06,s*.355,.005)],'skin',head,segments=5)
        # Inward-sloping eyes / strong brow, the most distinctive facial detail.
        x=s*.17
        poly(label+'_Eye_White',[(x-.1,-.314,.445),(x+.1,-.314,.445),(x+.095,-.314,.535),(x-.09,-.314,.55)],'white',head)
        bevelbox(label+'_Iris',(x,-.325,.493),(.077,.014,.095),'blue',head,0)
        bevelbox(label+'_Pupil',(x,-.338,.495),(.035,.008,.071),'black',head,0)
        bevelbox(label+'_Glint',(x-.012,-.345,.52),(.021,.004,.018),'white',head,0)
        poly(label+'_Angry_Brow',[(s*.058,-.345,.536),(s*.287,-.315,.604),(s*.25,-.318,.652),(s*.07,-.351,.582)],'brow',head)
    mesh('Nose',[(-.075,-.316,.398),(.075,-.316,.398),(0,-.455,.38),(0,-.322,.48),(0,-.36,.35)],[(0,2,3),(2,1,3),(0,4,2),(2,4,1)],'skinshade',head)
    poly('Frown',[(-.112,-.309,.274),(-.052,-.314,.295),(.012,-.316,.3),(.076,-.311,.281),(.125,-.307,.26),(.063,-.315,.274),(0,-.32,.283),(-.054,-.316,.28)],'mouth',head)
    # Big swept golden quiff, with deliberate asymmetric wedge-shaped polygon locks.
    ringmesh('Hair_Back',[(.18,.31,.24,0,.115),(.49,.4,.31,0,.1),(.77,.39,.3,0,.08),(.88,.31,.24,0,.06)],'hairshade',head,segments=8)
    for s,label in [(-1,'Left'),(1,'Right')]:
        ringmesh(label+'_Sideburn',[(.28,.085,.18,s*.34,.012),(.54,.115,.24,s*.34,.018),(.78,.1,.22,s*.31,.025)],'hair',head,segments=6)
    mesh('Swept_Gold_Quiff',[(-.4,-.23,.64),(-.37,-.38,.85),(-.29,-.24,1.015),(.15,-.2,1.055),(.58,-.12,1.03),(.43,-.37,.865),(.29,-.34,.67),(-.12,-.39,.7),(-.34,.25,.9),(.27,.28,.94),(.38,.15,.73)],[(0,1,7),(1,2,3,5),(3,4,5),(5,6,7,1),(0,7,6,10),(2,8,9,3),(3,9,4),(4,9,10,6,5),(0,8,2,1),(8,0,10,9)],'hair',head)
    quiff=objects[-1];quiff.data.materials.append(mats['hairlight']);quiff.data.materials.append(mats['hairshade'])
    for i,p in enumerate(quiff.data.polygons):p.material_index=[2,1,1,0,2,1,1,0,0,2][i]
    # Detachable sword, hidden by runtime except during the swing.
    sword=empty('SwordPivot',(0.37,-.04,-.94),limbs['RightArm'])
    bevelbox('Sword_Grip',(0,-.05,0),(.09,.26,.09),'hilt',sword,.015)
    bevelbox('Sword_Crossguard',(0,-.19,0),(.49,.07,.13),'hilt',sword,.02)
    mesh('Sword_Blade',[(-.085,-.23,0),(.085,-.23,0),(.065,-1.12,0),(0,-1.38,0),(-.065,-1.12,0),(0,-.23,.048),(0,-1.1,.038)],[(0,5,6,4),(5,1,2,6),(4,6,3),(6,2,3),(0,4,3,2,1)],'silver',sword)
    # Bake each limb into one mesh, preserving pivots and material groups.
    for parent in [body,head,*limbs.values(),sword]:
        direct=[o for o in scene.objects if o.type=='MESH' and o.parent==parent]
        if not direct:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in direct:o.select_set(True)
        bpy.context.view_layer.objects.active=direct[0];bpy.ops.object.join();direct[0].name=parent.name.replace('Pivot','')+'_Mesh'
    # Export only the character, with stable transform pivots for runtime animation.
    bpy.ops.object.select_all(action='DESELECT')
    for o in scene.objects:o.select_set(True)
    model_path=BASE+'/public/models/trump-n64.glb'
    bpy.ops.export_scene.gltf(filepath=model_path,export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_yup=True)
    # Independent source scene; do not save or overwrite the user's existing scene.
    source_path=BASE+'/assets/blender/trump-n64.blend'
    bpy.data.libraries.write(source_path,{scene},fake_user=True)
    # Render frontal and 3/4 reference for visual inspection.
    scene.world=bpy.data.worlds.new('Trump_Studio_World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.13,.22,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
    def light(name,loc,energy,size):
        d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.5))-o.location).to_track_quat('-Z','Y').to_euler()
    light('Key',(-3,-5,7),420,5);light('Fill',(4,-2,3),180,4);light('Rim',(0,4,5),280,3)
    camera_data=bpy.data.cameras.new('Trump_Preview_Camera');camera=bpy.data.objects.new('Trump_Preview_Camera',camera_data);scene.collection.objects.link(camera);camera.location=(3,-8,3.1);camera.rotation_euler=(Vector((0,0,1.62))-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';camera_data.ortho_scale=4.0;scene.camera=camera
    scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=760;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=BASE+'/artifacts/trump-model.png';scene.view_settings.view_transform='Standard';scene.render.film_transparent=True
    bpy.ops.render.render(write_still=True)
    result_data={'model':model_path,'source':source_path,'preview':scene.render.filepath,'meshes':sum(o.type=='MESH' for o in scene.objects),'triangles':sum(len(o.data.loop_triangles) for o in scene.objects if o.type=='MESH'),'bytes':os.path.getsize(model_path),'scene':scene.name,'original_scene_preserved':original.name}
    bpy.context.window.scene=original
    return result_data

previous_scene=bpy.context.window.scene
try:
    result=build()
finally:
    bpy.context.window.scene=previous_scene
