import {test,expect} from '@playwright/test';
test('game opts out of machine translation and blocks text callouts',async({page})=>{
 await page.goto('/');
 await expect(page.locator('main.game')).toBeVisible();
 expect(await page.locator('html').getAttribute('translate')).toBe('no');
 expect(await page.locator('main').getAttribute('translate')).toBe('no');
 const result=await page.locator('main button').first().evaluate(el=>{
  const menu=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});el.dispatchEvent(menu);
  const selection=new Event('selectstart',{bubbles:true,cancelable:true});el.dispatchEvent(selection);
  return {menu:menu.defaultPrevented,selection:selection.defaultPrevented,select:getComputedStyle(el).userSelect};
 });
 expect(result.menu).toBe(true);expect(result.selection).toBe(true);expect(result.select).toBe('none');
});
