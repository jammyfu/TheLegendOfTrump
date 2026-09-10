import { test, expect } from '@playwright/test';

test('hammer touches its marked landing point and a real hit shows stars over the stunned hero', async ({page}) => {
  const errors: string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?debug=boss&god=1');
  await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:60000});
  await expect.poll(()=>page.evaluate(()=>!!window.__scene?.getObjectByName('hero-stun-stars')),{timeout:60000}).toBe(true);
  await page.evaluate(()=>{
    const g=window.__game!;
    g.phase='playing';g.debug.invincible=false;g.hp=3;g.invincible=0;
    g.weapon='sword';g.boss.reset();g.boss.x=0;g.boss.z=0;g.boss.yaw=0;
    g.boss.move='slam';g.boss.state='windup';g.boss.timer=.55;
    g.x=g.boss.slamX;g.z=g.boss.slamZ;g.y=0;
    g.cameraYaw=1.1;g.cameraPitch=.3;g.cameraDistance=12;g.lockedTarget=null;
    g.autoLockCooldown=10;g.minions.forEach(e=>e.hp=0);g.elapsed=2;
    // Freeze only the fixture's simulation; continue rendering the exact pose.
    g.update=()=>{};
  });
  await page.waitForTimeout(350);
  await page.screenshot({path:'artifacts/boss-hammer-windup.png'});
  await page.evaluate(()=>{
    const g=window.__game!;
    g.boss.timer=.01;
    Object.getPrototypeOf(g).update.call(g,.02,{x:0,z:0,sprint:false});
  });
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('hero-stun-stars')?.visible)).toBe(true);
  const contact=await page.evaluate(()=>{
    const g=window.__game!, scene=window.__scene!;
    const hammer=scene.getObjectByName('BossHammer_head')!;
    const p=hammer.getWorldPosition(hammer.position.clone());
    const stars=scene.getObjectByName('hero-stun-stars')!;
    return {hp:g.hp,stun:g.stunTime,hammer:[p.x,p.y,p.z],landing:[g.boss.slamX,g.boss.slamZ],
      stars:stars.children.length, burst:scene.getObjectByName('boss-hammer-ground-bursts')!.children.some(c=>c.visible)};
  });
  expect(contact.hp).toBe(2);expect(contact.stun).toBeGreaterThan(.8);
  expect(contact.stars).toBe(5);expect(contact.burst).toBe(true);
  expect(Math.hypot(contact.hammer[0]-contact.landing[0],contact.hammer[2]-contact.landing[1])).toBeLessThan(.15);
  expect(contact.hammer[1]).toBeGreaterThan(.35);expect(contact.hammer[1]).toBeLessThan(1.05);
  await page.screenshot({path:'artifacts/boss-hammer-stun.png'});
  await page.evaluate(()=>{
    const g=window.__game!;
    g.boss.active=false;
    for(let i=0;i<30;i++) Object.getPrototypeOf(g).update.call(g,.05,{x:0,z:0,sprint:false});
  });
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('hero-stun-stars')?.visible)).toBe(false);
  expect(errors).toEqual([]);
});
