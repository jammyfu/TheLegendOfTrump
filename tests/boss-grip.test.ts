import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Vector3} from 'three';
import {bindBossHammer,poseBossWrist} from '../src/game/bossGrip';

test('hammer pivot stays inside the palm through ready, windup and impact',async()=>{
  const bytes=await readFile('public/models/iron-chancellor.glb');
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  bindBossHammer(scene);
  const hand=scene.getObjectByName('BossRightHand')!;
  const fist=scene.getObjectByName('BossFist')!;
  const weapon=scene.getObjectByName('BossWeapon')!;
  for(const pitch of [0,-2.3,1.1,Math.PI]){
    poseBossWrist(hand,pitch,pitch===Math.PI?0:.45);
    scene.updateMatrixWorld(true);
    assert.ok(fist.getWorldPosition(new Vector3()).distanceTo(weapon.getWorldPosition(new Vector3()))<.001);
  }
  poseBossWrist(hand,0,.45);scene.updateMatrixWorld(true);
  const head=scene.getObjectByName('BossHammer_head')!.getWorldPosition(new Vector3());
  // Head extends half a model unit each side: keep its inner edge outside helmet/chest.
  assert.ok(head.x < -1.4,'ready hammer must lean outboard, not overlap the helmet');
});
