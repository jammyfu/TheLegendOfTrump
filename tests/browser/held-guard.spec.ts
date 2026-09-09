import { test, expect } from "@playwright/test";
import { equipMelee } from "./fixtures";

test("right mouse defense stays raised while the button remains held", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: /跳过片头/ }).click();
  await equipMelee(page);
  const canvas = page.locator("canvas");
  await canvas.click({ button: "right" });
  // click releases immediately; now use a real held pointer sequence.
  await page.mouse.move(720, 450);
  await page.mouse.down({ button: "right" });
  await expect.poll(() => page.evaluate(() => window.__game!.guarding)).toBe(true);
  await page.mouse.move(850, 450, { steps: 4 });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => ({ guarding: window.__game!.guarding, stamina: window.__game!.stamina }))).toMatchObject({ guarding: true });
  await page.mouse.down({ button: "left" });
  await page.mouse.up({ button: "left" });
  expect(await page.evaluate(() => ({ guarding: window.__game!.guarding, attack: window.__game!.attackTime }))).toMatchObject({ guarding: true, attack: 0 });
  await page.screenshot({ path: "artifacts/qa-held-guard.png" });
  await page.mouse.up({ button: "right" });
  await expect.poll(() => page.evaluate(() => window.__game!.guarding)).toBe(false);
});
