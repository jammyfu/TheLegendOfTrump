import {test,expect} from '@playwright/test';
test('running fists render a lunging punch and additive meteor layers',async({page})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?debug=boss&god=1');
 await expect.poll(()=>page.evaluate(()=>!!window.__scene?.getObjectByName('RightWristPivot')),{timeout:90000}).toBe(true);
 await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
 await page.evaluate(()=>{
  const g=window.__game!;g.boss.active=false;g.boss.hp=0;g.minions.forEach(m=>m.hp=0);
  Object.assign(g,{weapon:'none',x:0,z:8,y:0,grounded:true,stamina:200,cooldown:0,attackTime:0,stunTime:0,phase:'playing',cameraYaw:2.3,cameraPitch:.25,cameraDistance:10,lockedTarget:null,autoLockCooldown:100});
 });
 await page.keyboard.down('Shift');await page.keyboard.down('w');
 await expect.poll(()=>page.evaluate(()=>window.__game!.sprinting)).toBe(true);
 await page.keyboard.press('j');
 await expect.poll(()=>page.evaluate(()=>window.__game!.rush)).toBe('punch');
 await page.evaluate(()=>{const g=window.__game!;g.update=()=>{};g.rushTime=.35;g.cameraYaw=g.yaw+Math.PI/2;});
 await page.keyboard.up('w');await page.keyboard.up('Shift');
 await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('meteor-composite-effects')!.children[0].visible)).toBe(true);
 await page.waitForTimeout(1000);
 await page.screenshot({path:'artifacts/running-impact-punch.png'});
 await page.evaluate(()=>{const g=window.__game!;g.impact(g.x+Math.sin(g.yaw)*1.6,g.z+Math.cos(g.yaw)*1.6,true,false,true);g.rush=null;g.rushTime=0;});
 await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('meteor-composite-effects')!.children[1].visible)).toBe(true);
 await page.waitForTimeout(700);
 await page.screenshot({path:'artifacts/meteor-combo-impact.png'});
 await page.evaluate(()=>{const g=window.__game!;for(let i=0;i<40;i++)Object.getPrototypeOf(g).update.call(g,.05,{x:0,z:0,sprint:false});});
 await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('meteor-composite-effects')!.children.some(c=>c.visible))).toBe(false);
 expect(errors).toEqual([]);
});
