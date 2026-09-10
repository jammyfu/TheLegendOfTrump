import {test,expect} from '@playwright/test';
test('arrival camera holds wide then cuts directly behind hero without rotor fly-through',async({page})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.waitForFunction(()=>!!window.__game);
 await page.evaluate(()=>window.__game!.beginIntro());
 await page.waitForFunction(()=>!!window.__scene?.getObjectByName('arrival-helicopter'),{},{timeout:90000});
 await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
 await page.evaluate(()=>{const g=window.__game!;g.update=()=>{};g.phase='intro';g.introTime=3;});
 await expect.poll(()=>page.evaluate(()=>window.__camera!.position.toArray())).toEqual([-6,8,199]);
 await page.screenshot({path:'artifacts/intro-fixed-wide.png'});
 const frames=await page.evaluate(async()=>{
  window.__game!.introTime=2;
  const positions:number[][]=[];
  for(let i=0;i<8;i++){
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   positions.push(window.__camera!.position.toArray());
  }
  return positions;
 });
 // The first rAF may run before R3F. Every subsequent frame must already be at the rear shot.
 for(const p of frames.slice(1)){
  expect(p[0]).toBeCloseTo(0,5);expect(p[1]).toBeCloseTo(3.8016210114,5);expect(p[2]).toBeCloseTo(187.770703799,5);
 }
 await page.screenshot({path:'artifacts/intro-fixed-rear.png'});
 expect(errors).toEqual([]);
});
