import { test, expect } from "@playwright/test";
test("automatic combat reticle, release and mobile acquisition", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await page.waitForFunction(
    () => !!window.__scene?.getObjectByName("LandscapeRoot"),
  );
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards.forEach((e) => {
      e.hp = 0;
      e.stun = 100;
    });
    g.x = -20;
    g.z = 15;
    g.cameraYaw = 0;
    g.lockedTarget = null;
    Object.assign(g.guards[0], { x: -20, z: 8, hp: 3 });
  });
  await expect(page.getByLabel("锁定准星")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__game!.lockedTarget))
    .toBe(0);
  await page.keyboard.press("KeyQ");
  await expect
    .poll(() => page.evaluate(() => window.__game!.lockedTarget))
    .toBeNull();
  await page.screenshot({ path: "artifacts/auto-lock-free-look.png" });
  await page.evaluate(() => (window.__game!.autoLockCooldown = 0));
  await expect(page.getByLabel("锁定准星")).toBeVisible();
  await page.screenshot({ path: "artifacts/auto-lock-combat.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("锁定准星")).toBeVisible();
  expect(errors).toEqual([]);
});
