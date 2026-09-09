import { test, expect } from "@playwright/test";
test("title fairies animate, remain noninteractive, and honor reduced motion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const canvas = page.locator(".lt-magic");
  await expect(canvas).toBeVisible();
  const pixels = () => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const first = await pixels();
  await expect
    .poll(pixels, { timeout: 20000, intervals: [250, 500, 1000] })
    .not.toBe(first);
  await page.screenshot({ path: "artifacts/title-fairies-desktop.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(150);
  const still = await pixels();
  await page.waitForTimeout(200);
  expect(await pixels()).toBe(still);
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await expect(canvas).toHaveCount(0);
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  expect(errors).toEqual([]);
});
test("larger residence, distant district and new playable lawn render without errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await expect
    .poll(
      () =>
        page.evaluate(() => !!window.__scene?.getObjectByName("EstateRoot")),
      { timeout: 15000 },
    )
    .toBeTruthy();
  await page.evaluate(() => {
    const g = window.__game!;
    g.x = 0;
    g.z = 105;
    g.cameraYaw = 0;
    g.cameraPitch = 0.16;
    g.cameraDistance = 14;
    g.guards.forEach((x) => (x.hp = 0));
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: "artifacts/estate-residence.png" });
  await page.keyboard.down("KeyS");
  await expect
    .poll(() => page.evaluate(() => window.__game!.z))
    .toBeGreaterThan(106);
  await page.keyboard.up("KeyS");
  await page.evaluate(() => {
    const g = window.__game!;
    g.cameraYaw = Math.PI;
    g.cameraPitch = 0.08;
    g.x = 0;
    g.z = 220;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/estate-ellipse-monument.png" });
  const nodes = await page.evaluate(() =>
    ["Treasury", "Eisenhower", "WashingtonMonument"].map(
      (n) => !!window.__scene!.getObjectByName(n),
    ),
  );
  expect(nodes).toEqual([true, true, true]);
  expect(errors).toEqual([]);
});
test("phone title preserves menu with reduced particle budget", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator(".lt-magic")).toBeVisible();
  await page.screenshot({ path: "artifacts/title-fairies-mobile.png" });
  await page.getByRole("button", { name: /开始冒险/ }).tap();
  await expect(page.locator(".lt-magic")).toHaveCount(0);
  await ctx.close();
});
