import {test,expect} from '@playwright/test';
test('boss escapes desk contact and hammer stays gripped throughout slam',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?debug=boss&god=1');
  await expect.poll(()=>page.evaluate(()=>!!window.__scene?.getObjectByName('BossRightHand')),{timeout:90000}).toBe(true);
  await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
  await page.evaluate(()=>{
    const g=window.__game!;g.update=()=>{};
    g.boss.reset();Object.assign(g.boss,{x:0,z:-17.02,timer:0});
    const colliders=g.colliders.filter(c=>!c.id.startsWith('guard-'));
    for(let i=0;i<400;i++)g.boss.update(.05,{x:0,z:-27},colliders,()=>1);
  });
  expect(await page.evaluate(()=>window.__game!.boss.sequence)).toBeGreaterThan(0);
  await page.evaluate(()=>{
    const g=window.__game!;
    Object.assign(g,{x:0,z:7,y:0,phase:'playing',cameraYaw:.2,cameraPitch:.3,cameraDistance:14,lockedTarget:null,impactTime:0});
    g.minions.forEach(m=>m.hp=0);g.boss.reset();Object.assign(g.boss,{x:0,z:0,yaw:0,timer:1});
  });
  for(const [name,state,timer] of [['ready','chase',1],['raised','windup',.5],['contact','recover',1.3]] as const){
    await page.evaluate(({state,timer})=>{Object.assign(window.__game!.boss,{state,timer,move:'slam'});},{state,timer});
    await page.waitForTimeout(700);
    const separation=await page.evaluate(()=>{
      const scene=window.__scene!,f=scene.getObjectByName('BossFist')!,w=scene.getObjectByName('BossWeapon')!;
      return f.getWorldPosition(f.position.clone()).distanceTo(w.getWorldPosition(w.position.clone()));
    });
    expect(separation).toBeLessThan(.001);
    await page.screenshot({path:`artifacts/boss-grip-${name}.png`});
  }
  expect(errors).toEqual([]);
});
