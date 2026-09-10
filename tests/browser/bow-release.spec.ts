import { test, expect } from '@playwright/test';

test('both mouse buttons draw under pointer lock and release exactly one arrow', async ({ page }) => {
  await page.goto('/?debug=boss&god=1');
  await expect(page.locator('.game-loading')).toHaveCount(0, { timeout: 60000 });
  await page.evaluate(() => {
    const g = window.__game!;
    g.weapon = 'bow'; g.boss.hp = 0; g.minions.forEach(e => e.hp = 0);
    g.phase = 'playing'; g.cooldown = 0;
  });
  for (const button of ['left', 'right'] as const) {
    await page.evaluate(() => { window.__game!.cooldown = 0; });
    const before = await page.evaluate(() => window.__game!.arrows);
    await page.mouse.move(720, 450);
    await page.mouse.down({ button });
    await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__game!.bowDraw)).toBeGreaterThan(.3);
    expect(await page.evaluate(() => window.__game!.arrows)).toBe(before);
    expect(await page.evaluate(() => window.__game!.aiming)).toBe(button === 'right');
    await page.mouse.move(750, 460);
    await page.screenshot({ path: `artifacts/bow-${button}-draw.png` });
    await page.mouse.up({ button });
    await expect.poll(() => page.evaluate(() => window.__game!.arrows)).toBe(before - 1);
    await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(false);
    expect(await page.evaluate(() => window.__game!.phase)).toBe('playing');
  }
  await page.evaluate(() => window.__game!.cooldown = 0);
  const ammo = await page.evaluate(() => window.__game!.arrows);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await page.evaluate(() => window.__game!.arrows)).toBe(ammo);

  // WebViews without Pointer Lock get continuous edge turning and captured
  // release. A stationary cursor at the edge must keep rotating the view.
  await page.evaluate(() => {
    const g = window.__game!;
    g.phase = 'playing'; g.cooldown = 0;
    Object.defineProperty(document.querySelector('canvas')!, 'requestPointerLock', { value: undefined, configurable: true });
  });
  await page.mouse.move(720, 450);
  await page.mouse.down({ button: 'right' });
  await expect.poll(() => page.evaluate(() => window.__game!.attackHeld)).toBe(true);
  expect(await page.evaluate(() => window.__game!.toast)).toContain('贴近画面边缘持续转向');
  expect(await page.evaluate(() => !!document.pointerLockElement)).toBe(false);
  await expect(page.locator('canvas')).toHaveAttribute('data-aim-input', 'drag');
  const yaw = await page.evaluate(() => window.__game!.cameraYaw);
  await page.mouse.move(1438, 450);
  await expect.poll(() => page.evaluate(() => window.__game!.cameraYaw)).toBeLessThan(yaw - .03);
  const atEdge = await page.evaluate(() => window.__game!.cameraYaw);
  await expect.poll(() => page.evaluate(() => window.__game!.cameraYaw)).toBeLessThan(atEdge - .03);
  await expect(page.locator('#bow-crosshair')).toHaveAttribute('data-pan', 'true');
  await page.screenshot({ path: 'artifacts/bow-drag-edge-aim.png' });
  await page.mouse.move(720, 450);
  await expect(page.locator('#bow-crosshair')).toHaveAttribute('data-pan', 'false');
  const stopped = await page.evaluate(() => window.__game!.cameraYaw);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.__game!.cameraYaw)).toBe(stopped);
  await page.mouse.up({ button: 'right' });
  expect(await page.evaluate(() => window.__game!.arrows)).toBe(ammo - 1);
  await expect(page.locator('canvas')).not.toHaveAttribute('data-aim-input', 'drag');
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.__game!.cameraYaw)).toBe(stopped);
});
