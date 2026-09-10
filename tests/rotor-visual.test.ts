import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import {createRotorVisual} from '../src/game/rotorVisual';
test('fast rotor suppresses strobing blades and shadows; parked rotor restores solid blades',()=>{
 const rotor=new Group(),original=new MeshStandardMaterial();
 const blade=new Mesh(new BoxGeometry(9,.02,.3),original);rotor.add(blade);
 const visual=createRotorVisual(rotor,9.6,'y');
 visual.update(1);
 assert.ok((blade.material as MeshStandardMaterial).opacity<.2);
 assert.equal(blade.castShadow,false);
 assert.equal(visual.blur.visible,true);
 assert.equal(original.opacity,1,'shared GLTF material must not be mutated');
 visual.update(0);
 assert.equal((blade.material as MeshStandardMaterial).opacity,1);
 assert.equal(blade.castShadow,true);
 assert.equal(visual.blur.visible,false);
 visual.dispose();
});
