import { test, expect } from '@playwright/test';

for (const size of [
  {width:1440,height:900,touch:false},
  {width:1024,height:768,touch:false},
  {width:390,height:844,touch:true},
  {width:360,height:740,touch:true},
  {width:844,height:390,touch:true},
]) {
  test(`HUD regions and icons do not overlap at ${size.width}x${size.height}`, async ({browser}) => {
    const context=await browser.newContext({viewport:size,hasTouch:size.touch,isMobile:size.touch});
    const page=await context.newPage();
    page.on('pageerror',e=>console.error(e.message));
    // Render the real HUD with a deterministic game state, independent of WebGL
    // asset loading. Full-game smoke coverage lives in game.spec.ts.
    await page.route('**/src/main.tsx*', route => route.fulfill({contentType:'application/javascript',body:`import '/tests/browser/hud-fixture.tsx';`}));
    await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:4439/',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.hud-layout')).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    const inspect=()=>page.evaluate(()=>{
      const selectors=['.vital-hud','.weapon-hud','.expedition-hud','.gem-count','.adventure-menu','.quest','.minimap','.boss-hud','.combo-status','.toast','.interact-prompt','.adventure-controls','.adventure-buttons','.joystick'];
      const rects=selectors.flatMap(s=>{const e=document.querySelector('.hud-layout '+s);if(!e||!e.getClientRects().length||getComputedStyle(e).display==='none')return [];const r=e.getBoundingClientRect();return [{s,x:r.x,y:r.y,w:r.width,h:r.height}];});
      const collisions:string[]=[];
      for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
        const a=rects[i],b=rects[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>2&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>2)collisions.push(a.s+' / '+b.s);
      }
      const outside=rects.filter(r=>r.x<0||r.y<0||r.x+r.w>innerWidth+1||r.y+r.h>innerHeight+1);
      const tiny=[...document.querySelectorAll('.hud-layout .quest p,.hud-layout .ammunition,.hud-layout .stamina span,.hud-layout .adventure-buttons small')].filter(e=>e.getClientRects().length&&parseFloat(getComputedStyle(e).fontSize)<15).map(e=>e.className);
      return {collisions,outside,tiny};
    });
    expect(await inspect()).toEqual({collisions:[],outside:[],tiny:[]});
    if(size.touch){
      const buttons=page.locator('.adventure-buttons button');
      for(let i=0;i<4;i++){const r=await buttons.nth(i).boundingBox();expect(r!.width).toBeGreaterThanOrEqual(44);expect(r!.height).toBeGreaterThanOrEqual(44);}
    }
    await page.screenshot({path:`/tmp/hud-${size.width}x${size.height}.png`});
    await page.evaluate(()=>window.dispatchEvent(new Event('hud-battle')));
    await expect(page.locator('.boss-hud')).toBeVisible();
    expect(await inspect()).toEqual({collisions:[],outside:[],tiny:[]});
    await page.screenshot({path:`/tmp/hud-battle-${size.width}x${size.height}.png`});
    if(size.touch) {
      await page.getByRole('button',{name:'切换地图',exact:true}).click();
      expect(await inspect()).toEqual({collisions:[],outside:[],tiny:[]});
    }
    await context.close();
  });
}
