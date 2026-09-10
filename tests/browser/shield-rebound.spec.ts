import { test, expect } from '@playwright/test';

test('both shield tiers use both hands and spring back after a real contact',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?debug=boss&god=1');
  await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
  await expect.poll(()=>page.evaluate(()=>!!window.__scene?.getObjectByName('RightWristPivot')),{timeout:30000}).toBe(true);
  await page.evaluate(()=>{
    const g=window.__game!;
    // Keep render frames live; step this short contact sequence deterministically.
    g.update=()=>{};
    g.boss.active=false;g.minions.forEach(e=>e.hp=0);
  });
  for(const upgraded of [false,true]){
    await page.evaluate(upgraded=>{
      const g=window.__game!;
      Object.assign(g,{phase:'playing',x:0,z:12,y:0,grounded:true,weapon:'sword',
        swordUnlocked:true,shieldUnlocked:true,shieldUpgraded:upgraded,swordUpgraded:upgraded,
        stamina:200,attackTime:0,cooldown:0,rush:null,rushTime:0,rushRebounding:false,
        spinTime:0,dodgeTime:0,stunTime:0,invincible:0,lockedTarget:null,
        autoLockCooldown:100,cameraYaw:0,cameraPitch:.2,cameraDistance:7});
      g.lastInput={x:0,z:0,sprint:false};
      g.boss.active=false;g.boss.x=-8;g.boss.z=0;
      if(!g.startRush('shield',{x:0,z:-1,sprint:true}))throw new Error('Shield rush rejected');
      g.rushTime=.38;
      g.cameraYaw=1.1;
    },upgraded);
    await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('EquippedSword')?.parent?.name)).toBe('TorsoPivot');
    const verifyGrip=async()=>{
      await expect.poll(()=>page.evaluate(()=>{
        const scene=window.__scene!,shield=scene.getObjectByName('EquippedShield')!;
        return Math.max(...['Left','Right'].map((side,i)=>{
          const wrist=scene.getObjectByName(side+'WristPivot')!;
          const target=shield.localToWorld(shield.position.clone().set(i===0?.2:-.2,.16,-.18));
          return wrist.getWorldPosition(wrist.position.clone()).distanceTo(target);
        }));
      })).toBeLessThan(.04);
    };
    await verifyGrip();
    await page.screenshot({path:`artifacts/shield-two-hand-${upgraded?'metal':'wood'}.png`});
    const impact=await page.evaluate(()=>{
      const g=window.__game!;
      g.boss.active=true;g.boss.hp=18;g.boss.state='recover';g.boss.timer=10;
      g.boss.x=0;g.boss.z=10.5;g.boss.yaw=0;
      g.hitStop=0;
      Object.getPrototypeOf(g).update.call(g,.016,{x:0,z:-1,sprint:true,guard:true});
      return {rebound:g.rushRebounding,z:g.z,hp:g.boss.hp};
    });
    expect(impact.rebound).toBe(true);expect(impact.hp).toBeCloseTo(17.2);
    await page.evaluate(()=>{
      const g=window.__game!;g.hitStop=0;g.boss.active=false;g.boss.x=-8;g.boss.z=0;
      for(let i=0;i<3;i++)Object.getPrototypeOf(g).update.call(g,.05,{x:0,z:-1,sprint:true,guard:true});
    });
    await page.waitForTimeout(100);
    await verifyGrip();
    expect(await page.evaluate(()=>window.__game!.z)).toBeGreaterThan(impact.z+.3);
    await page.screenshot({path:`artifacts/shield-rebound-${upgraded?'metal':'wood'}.png`});
    await page.evaluate(()=>{
      const g=window.__game!;
      for(let i=0;i<5;i++)Object.getPrototypeOf(g).update.call(g,.05,{x:0,z:0,sprint:false,guard:true});
    });
    expect(await page.evaluate(()=>window.__game!.rush)).toBe(null);
    await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('EquippedShield')?.parent?.name)).toBe('LeftWristPivot');
  }
  expect(errors).toEqual([]);
});
