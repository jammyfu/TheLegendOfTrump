import {test,expect} from '@playwright/test';

test('held fists release, recover and keep rendering and accepting movement',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.stack??e.message));
  await page.goto('/?debug=boss&god=1');
  await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
  await expect.poll(()=>page.evaluate(()=>window.__scene?.getObjectByName('enemy-health-100')?.userData.maxHp),{timeout:30000}).toBeGreaterThan(0);
  await page.evaluate(()=>{
    const g=window.__game!;g.boss.active=false;g.boss.hp=0;g.minions.forEach(m=>m.hp=0);
    g.cancelCharge();Object.assign(g,{weapon:'none',combo:0,heavyPunch:false,attackTime:0,cooldown:0,
      x:0,z:12,y:0,cameraYaw:0,lockedTarget:null,autoLockCooldown:100,phase:'playing'});
  });
  for(let i=0;i<2;i++){
    await page.keyboard.down('j');
    await expect.poll(()=>page.evaluate(()=>window.__game!.chargeTime),{timeout:15000}).toBeGreaterThanOrEqual(.65);
    await page.waitForTimeout(1500);
    if(i===0)await page.screenshot({path:'artifacts/heavy-punch-held.png'});
    await page.keyboard.up('j');
    await expect.poll(()=>page.evaluate(()=>window.__game!.heavyPunch)).toBe(true);
    await expect.poll(async()=>({...await page.evaluate(()=>({heavy:window.__game!.heavyPunch,time:window.__game!.attackTime})),errors}),{timeout:30000}).toEqual({heavy:false,time:0,errors:[]});
    const before=await page.evaluate(()=>({x:window.__game!.x,z:window.__game!.z,t:window.__game!.elapsed}));
    await page.keyboard.down('d');
    await expect.poll(()=>page.evaluate(p=>Math.hypot(window.__game!.x-p.x,window.__game!.z-p.z),before),{timeout:15000}).toBeGreaterThan(.3);
    await page.keyboard.up('d');
    expect(await page.evaluate(()=>window.__game!.elapsed)).toBeGreaterThan(before.t);
    expect(errors).toEqual([]);
  }
  await page.screenshot({path:'artifacts/heavy-punch-recovered.png'});
});
