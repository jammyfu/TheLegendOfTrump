import {test,expect} from '@playwright/test';
test('victory replay starts gameplay without entering arrival cinematic',async({page})=>{
 test.setTimeout(120000);
 await page.goto('/');await page.waitForFunction(()=>!!window.__game);
 await page.evaluate(()=>{window.__game!.beginIntro();window.__game!.skipIntro();});
 await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
 await page.evaluate(()=>{const g=window.__game!;g.phase='won';g.completedCampaign=true;g.version++;});
 // Use the result panel's primary button independently of the selected locale.
 const primary=page.locator('button.primary').filter({hasText:/高难度|Hard|hard/});
 await expect(primary).toBeVisible();await primary.click();
 expect(await page.evaluate(()=>window.__game!.phase)).toBe('playing');
 await page.waitForTimeout(1200);
 expect(await page.evaluate(()=>window.__game!.phase)).toBe('playing');
});
