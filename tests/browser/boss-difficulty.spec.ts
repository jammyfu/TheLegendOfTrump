import {test,expect} from '@playwright/test';

test('hard boss has double health and all four summons have models, health bars and portals',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    localStorage.setItem('legend-campaign-completed','1');
    localStorage.setItem('legend-difficulty','hard');
  });
  await page.goto('/?debug=boss&god=1');
  await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
  await expect.poll(()=>page.evaluate(()=>!!window.__scene?.getObjectByName('guard-104')),{timeout:90000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.__scene?.getObjectByName('enemy-health-100')?.userData.maxHp),{timeout:30000}).toBe(36);
  expect(await page.evaluate(()=>({hp:window.__game!.boss.maxHp,difficulty:window.__game!.difficulty}))).toEqual({hp:36,difficulty:'hard'});
  await page.evaluate(()=>{
    const g=window.__game!;g.update=()=>{};g.phase='playing';g.hitStop=0;g.boss.hp=27;g.boss.state='recover';g.boss.timer=5;
    g.minions.forEach(m=>m.hp=0);g.summonCooldown=0;
    Object.getPrototypeOf(g).update.call(g,.01,{x:0,z:0,sprint:false});
  });
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('boss-summon-portals')!.children.filter(c=>c.visible).length)).toBe(4);
  await page.screenshot({path:'artifacts/boss-hard-summon-portals.png'});
  await page.evaluate(()=>{
    const g=window.__game!;
    for(let i=0;i<25;i++)Object.getPrototypeOf(g).update.call(g,.05,{x:0,z:0,sprint:false});
  });
  await expect.poll(()=>page.evaluate(()=>[101,102,103,104].every(id=>
    window.__scene!.getObjectByName(`guard-${id}`)?.visible&&window.__scene!.getObjectByName(`enemy-health-${id}`)?.visible))).toBe(true);
  await page.screenshot({path:'artifacts/boss-hard-four-soldiers.png'});
  await page.evaluate(()=>{window.__game!.phase='lost';window.__game!.retry();});
  expect(await page.evaluate(()=>window.__game!.boss.hp)).toBe(36);
  expect(errors).toEqual([]);
});
