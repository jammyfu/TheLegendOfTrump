import type {Object3D} from 'three';
/** Keep the authored shaft origin (and slam reach), but make it the palm pivot.
 * The fist and weapon now turn together instead of the shaft orbiting the hand. */
export function bindBossHammer(model:Object3D) {
  const hand=model.getObjectByName('BossRightHand')!;
  const weapon=model.getObjectByName('BossWeapon')!;
  const fist=model.getObjectByName('BossFist')!;
  hand.position.add(weapon.position);
  weapon.position.set(0,0,0);
  fist.position.set(0,0,0);
}
export function poseBossWrist(hand:Object3D,pitch:number,roll:number) {
  hand.rotation.set(pitch,0,roll);
}
