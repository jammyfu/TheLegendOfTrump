import { test, expect } from '@playwright/test';
test('rush equipment and poses render without runtime errors',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(()=>!!window.__game,{},{timeout:15000});
  await page.evaluate(()=>{window.__game!.start();});
  await expect.poll(()=>page.evaluate(()=>!!window.__scene?.getObjectByName('RightWristPivot')),{timeout:90000}).toBe(true);
  for(const kind of ['thrust','shield'] as const){
    await page.evaluate(kind=>{
      const g=window.__game!;
      Object.assign(g,{phase:'playing',x:0,z:145,y:0,grounded:true,weapon:'sword',
        swordUnlocked:true,shieldUnlocked:true,stamina:200,attackTime:0,cooldown:0,
        rush:null,rushTime:0,spinTime:0,dodgeTime:0,stunTime:0,invincible:100,lockedTarget:null,autoLockCooldown:100,cameraYaw:2.4});
      g.guards.forEach(e=>e.stun=100);
      if (!g.startRush(kind,{x:0,z:-1,sprint:true})) throw new Error('Rush rejected: '+JSON.stringify({phase:g.phase,grounded:g.grounded,cooldown:g.cooldown,stamina:g.stamina}));
      g.rushTime=.38;g.hitStop=100;
    },kind);
    await expect.poll(()=>page.evaluate(()=>({rush:window.__game!.rush,phase:window.__game!.phase,parent:window.__scene!.getObjectByName('EquippedSword')?.parent?.name}))).toEqual({rush:kind,phase:'playing',parent:kind==='shield'?'TorsoPivot':'RightWristPivot'});
    if(kind==='shield'){
      // The pose must mount the shield even before the next physics tick.
      await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('EquippedShield')?.parent?.name)).toBe('TorsoPivot');
    }
    await page.screenshot({path:`artifacts/qa-rush-${kind}.png`});
  }
  expect(errors).toEqual([]);
});
