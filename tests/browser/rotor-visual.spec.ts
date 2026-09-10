import {test,expect} from '@playwright/test';
test('intro rotor blends into a clean disc and disappears when parked',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.waitForFunction(()=>!!window.__game);
 await page.evaluate(()=>{window.__game!.beginIntro();});
 await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
 await page.waitForFunction(()=>!!window.__scene?.getObjectByName('Rotor motion blur'),{},{timeout:90000});
 await page.evaluate(()=>{const g=window.__game!;g.update=()=>{};g.phase='intro';g.introTime=5;});
 await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('Rotor motion blur')!.visible)).toBe(true);
 await page.waitForTimeout(500);
 await page.screenshot({path:'artifacts/rotor-flight-blur.png'});
 await page.evaluate(()=>{window.__game!.skipIntro();});
 await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('Rotor motion blur')!.visible)).toBe(false);
 expect(errors).toEqual([]);
});
