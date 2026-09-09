import { test, expect } from "@playwright/test";
import { equipMelee } from "./fixtures";

test("right mouse defense stays raised while the button remains held", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: /跳过片头/ }).click();
  await equipMelee(page);
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards.forEach(e => e.hp = 0);
    Object.assign(g, { x: 0, z: 145, y: 0, grounded: true, yaw: 0 });
  });
  const canvas = page.locator("canvas");
  await canvas.click({ button: "right" });
  // click releases immediately; now use a real held pointer sequence.
  await page.mouse.move(720, 450);
  await page.mouse.down({ button: "right" });
  await expect.poll(() => page.evaluate(() => window.__game!.guarding)).toBe(true);
  await expect.poll(() => page.evaluate(() =>
    window.__scene!.getObjectByName("EquippedShield")?.parent?.name,
  ), { timeout: 15000 }).toBe("LeftWristPivot");
  // No motion, no attack: hold through multiple rendered frames and a hit.
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => ({
      guard: window.__game!.guarding,
      shield: window.__scene!.getObjectByName("EquippedShield")?.parent?.name,
    }))).toEqual({ guard: true, shield: "LeftWristPivot" });
  }
  await page.evaluate(() => {
    const g = window.__game!;
    Object.assign(g.guards[0], { hp: 3, x: 0, z: 147, yaw: Math.PI,
      windup: .08, cooldown: 10, stun: 0 });
  });
  await expect.poll(() => page.evaluate(() => window.__game!.stamina)).toBeLessThan(200);
  expect(await page.evaluate(() => window.__game!.hp)).toBe(3);
  await expect.poll(() => page.evaluate(() => window.__game!.guarding)).toBe(true);
  // Compatibility mouseup must not end the still-captured pointer hold.
  await canvas.dispatchEvent("mouseup", { button: 2, buttons: 2 });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__game!.guarding)).toBe(true);
  await page.mouse.move(850, 450, { steps: 4 });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => ({ guarding: window.__game!.guarding, stamina: window.__game!.stamina }))).toMatchObject({ guarding: true });
  await page.mouse.down({ button: "left" });
  await page.mouse.up({ button: "left" });
  expect(await page.evaluate(() => ({ guarding: window.__game!.guarding, attack: window.__game!.attackTime }))).toMatchObject({ guarding: true, attack: 0 });
  await page.screenshot({ path: "artifacts/qa-held-guard.png" });
  await page.mouse.up({ button: "right" });
  await expect.poll(() => page.evaluate(() => window.__game!.guarding)).toBe(false);
  await page.mouse.down({ button: "right" });
  await expect.poll(() => page.evaluate(() => window.__game!.guarding)).toBe(true);
  await page.mouse.down({ button: "left" });
  await page.mouse.up({ button: "right" });
  await expect.poll(() => page.evaluate(() => window.__game!.guarding)).toBe(false);
  await page.mouse.up({ button: "left" });
  await page.mouse.down({ button: "right" });
  await expect.poll(() => page.evaluate(() => window.__game!.guarding)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  expect(await page.evaluate(() => window.__game!.phase)).toBe("paused");
  await page.mouse.up({ button: "right" });
  await page.getByRole("button", { name: "继续冒险" }).click();
  await expect.poll(() => page.evaluate(() => window.__game!.guarding)).toBe(false);
});
