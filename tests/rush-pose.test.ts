import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Group, Quaternion, Vector3 } from 'three';
import { fitHand, fitShieldHand, SHIELD_HANDS } from '../src/game/handGrip';
import { rushPose, shieldBracePose, SHIELD_REBOUND } from '../src/game/rush';
test('somersault finishes before the thrust can hit and leaves the body upright',()=>{
  const middle=rushPose('thrust',.68), strike=rushPose('thrust',.49);
  assert.ok(middle.flip>.4 && middle.flip<.6);
  assert.ok(middle.lift>.7);assert.equal(middle.active,false);
  assert.equal(strike.flip,1);assert.equal(strike.active,true);
  assert.ok(strike.lift<1e-8);assert.equal(rushPose('thrust',0).active,false);
});
test('shield rebound closes the damage window and eases backward to a stop',()=>{
  const impact=rushPose('shield',SHIELD_REBOUND.duration,true);
  const mid=rushPose('shield',SHIELD_REBOUND.duration/2,true);
  const end=rushPose('shield',0,true);
  assert.equal(impact.active,false);assert.equal(mid.active,false);
  assert.ok(impact.speed<mid.speed && mid.speed<0);assert.equal(end.speed,0);
  assert.ok(mid.lift>0);assert.ok(end.lift<1e-8);
  assert.ok(shieldBracePose(.15,true).pitch<0,'upper body springs back behind the brace');
  assert.equal(shieldBracePose(0,true).crouch,0);
});
test('both shield hands remain attached to the rear grip through windup, charge and rebound',async()=>{
  const data=await readFile('public/models/trump-n64.glb');
  const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const torso=gltf.scene.getObjectByName('TorsoPivot')!;
  const waist=gltf.scene.getObjectByName('WaistPivot')!;
  const shield=new Group();torso.add(shield);
  gltf.scene.rotation.y=1.7;gltf.scene.scale.setScalar(.92);
  for(const [remaining,rebound] of [[.64,false],[.4,false],[.3,true],[.2,true],[.1,true],[0,true]] as const){
    const brace=shieldBracePose(remaining,rebound);
    waist.rotation.set(brace.pitch,0,0);
    shield.position.set(0,1.62,brace.shieldForward);
    shield.quaternion.copy(torso.getWorldQuaternion(new Quaternion()).invert())
      .multiply(gltf.scene.getWorldQuaternion(new Quaternion()));
    for(const side of ['left','right'] as const){
      const prefix=side==='left'?'Left':'Right';
      const arm=gltf.scene.getObjectByName(prefix+'ArmPivot')!;
      const elbow=gltf.scene.getObjectByName(prefix+'ElbowPivot')!;
      const wrist=gltf.scene.getObjectByName(prefix+'WristPivot')!;
      const rest=[arm,elbow,wrist].map(n=>n.position.clone());
      arm.rotation.set(-1.1,0,side==='left'?.45:-.45);elbow.rotation.set(-.8,0,0);
      fitShieldHand(arm,elbow,wrist,shield,side);
      const target=shield.localToWorld(new Vector3(...SHIELD_HANDS[side]));
      assert.ok(wrist.getWorldPosition(new Vector3()).distanceTo(target)<.04,`${side} ${remaining} ${rebound}`);
      assert.ok(wrist.getWorldQuaternion(new Quaternion()).angleTo(shield.getWorldQuaternion(new Quaternion()))<1e-6);
      [arm,elbow,wrist].forEach((n,i)=>assert.ok(n.position.equals(rest[i])));
    }
  }
});
test('both real character arms can reach a shared central sword grip without moving joints',async()=>{
  const data=await readFile('public/models/trump-n64.glb');
  const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const torso=gltf.scene.getObjectByName('TorsoPivot')!;
  for(const side of ['Right','Left']) {
    const arm=gltf.scene.getObjectByName(side+'ArmPivot')!;
    const elbow=gltf.scene.getObjectByName(side+'ElbowPivot')!;
    const wrist=gltf.scene.getObjectByName(side+'WristPivot')!;
    const positions=[arm,elbow,wrist].map(n=>n.position.clone());
    arm.rotation.set(-1.2,0,side==='Right'?-.5:.5);elbow.rotation.x=-.5;
    torso.updateWorldMatrix(true,true);
    const target=torso.localToWorld(new Vector3(-.06,1.72,side==='Right'?.48:.33));
    fitHand(arm,elbow,wrist,target);
    assert.ok(wrist.getWorldPosition(new Vector3()).distanceTo(target)<.045);
    [arm,elbow,wrist].forEach((n,i)=>assert.ok(n.position.equals(positions[i])));
  }
});
