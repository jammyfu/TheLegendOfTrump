import {test,expect} from '@playwright/test';

test('boss detours around sofa, wave damages through desk, and desk-back camera fades furniture',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?debug=boss');
  await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
  await expect.poll(()=>page.evaluate(()=>window.__scene?.getObjectByName('enemy-health-100')?.userData.maxHp),{timeout:30000}).toBeGreaterThan(0);
  await page.evaluate(()=>{
    const g=window.__game!;g.update=()=>{};g.phase='playing';g.debug.invincible=false;
    g.minions.forEach(m=>m.hp=0);
    Object.assign(g,{x:19,y:0,z:4.1,weapon:'bow',cameraYaw:.7,cameraPitch:.5,cameraDistance:16,lockedTarget:null,autoLockCooldown:100});
    g.boss.reset();Object.assign(g.boss,{x:29,z:4.1,sequence:1,timer:0});
    const obstacles=g.colliders.filter(c=>!c.id.startsWith('guard-'));
    for(let i=0;i<240;i++){
      g.boss.update(.05,g,obstacles,()=>0);
      if(Math.hypot(g.boss.x-g.x,g.boss.z-g.z)<4)break;
    }
  });
  expect(await page.evaluate(()=>Math.hypot(window.__game!.boss.x-19,window.__game!.boss.z-4.1))).toBeLessThan(4);
  await page.waitForTimeout(300);
  await page.screenshot({path:'artifacts/boss-sofa-detour.png'});
  await page.evaluate(()=>{
    const g=window.__game!;
    Object.assign(g.boss,{active:false,x:0,z:-25,waveX:0,waveZ:-25,wave:8.9,waveHit:false});
    Object.assign(g,{x:0,y:0,z:-16,hp:3,invincible:0,hitStop:0,grounded:true});
    Object.getPrototypeOf(g).update.call(g,.01,{x:0,z:0,sprint:false});
  });
  expect(await page.evaluate(()=>window.__game!.hp)).toBe(2);
  await page.evaluate(()=>{
    const g=window.__game!;
    Object.assign(g,{x:0,z:-25,y:0,cameraYaw:0,cameraPitch:.18,cameraDistance:12,impactTime:0,aiming:false,invincible:0,hitStop:0});
    g.effects=[];
    g.boss.x=9;g.boss.z=-16;
    g.boss.wave=-1;
  });
  const opacity=()=>page.evaluate(()=>{
    const values:number[]=[];
    window.__scene!.traverse(o=>{
      if(o.name!=='office-desk'&&o.name!=='office-chair')return;
      const mesh=o as import('three').Mesh;
      for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])values.push(m.opacity);
    });
    return Math.min(...values);
  });
  await page.waitForTimeout(700);
  await page.screenshot({path:'artifacts/office-desk-back-before-check.png'});
  await expect.poll(opacity,{timeout:15000}).toBeLessThan(.3);
  await page.screenshot({path:'artifacts/office-desk-back-visible.png'});
  await page.evaluate(()=>{Object.assign(window.__game!,{x:12,z:2,cameraYaw:0,cameraPitch:.4});});
  await expect.poll(opacity,{timeout:15000}).toBeGreaterThan(.95);
  expect(errors).toEqual([]);
});
