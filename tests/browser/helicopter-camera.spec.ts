import {test,expect} from '@playwright/test';
test('close aircraft orbit retains visible hero and safe camera',async({page})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.waitForFunction(()=>!!window.__game);
 await page.evaluate(()=>{window.__game!.beginIntro();window.__game!.skipIntro();});
 await expect.poll(()=>page.evaluate(()=>!!window.__scene?.getObjectByName('arrival-helicopter')),{timeout:90000}).toBe(true);
 await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
 await page.evaluate(()=>{window.__game!.update=()=>{};});
 for(const [x,z,yaw,y] of [[5.71,183,Math.PI/2,0],[10.29,183,-Math.PI/2,0],[8,177.25,0,0],[5.71,181.5,-.34,0],[5.71,181.5,1.66,2.5],[5.71,182,2.86,1.5]]){
  await page.evaluate(({x,z,yaw,y})=>{const g=window.__game!;Object.assign(g,{x,z,y,cameraYaw:yaw,cameraPitch:.3,cameraDistance:9.5,weapon:'none',lockedTarget:null,autoLockCooldown:100,invincible:0});}, {x,z,yaw,y});
  await expect.poll(()=>page.evaluate(()=>{const g=window.__game!,c=window.__camera!;return Math.hypot(c.position.x-g.x,c.position.y-g.y-1.9,c.position.z-g.z);})).toBeGreaterThan(3);
  await page.waitForTimeout(700);
  await page.screenshot({path:`artifacts/helicopter-safe-camera-${x}-${z}-${y}.png`});
 }
 expect(errors).toEqual([]);
});
