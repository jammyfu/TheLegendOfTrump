import { test, expect } from "@playwright/test";
test("layered skyline and landscaped lawn render from multiple directions", async ({
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
        page.evaluate(() => !!window.__scene?.getObjectByName("LandscapeRoot")),
      { timeout: 20000 },
    )
    .toBeTruthy();
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards.forEach((e) => (e.hp = 0));
    g.cameraDistance = 12;
    g.cameraPitch = 0.15;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "artifacts/landscape-south-arrival.png" });
  await page.evaluate(() => {
    const g = window.__game!;
    g.x = 0;
    g.z = 115;
    g.cameraYaw = 0.35;
    g.cameraPitch = 0.15;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/landscape-garden-walk.png" });
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => window.__game!.z))
    .toBeLessThan(114);
  await page.keyboard.up("KeyW");
  await page.evaluate(() => {
    const g = window.__game!;
    g.x = 70;
    g.z = 190;
    g.cameraYaw = Math.PI * 0.8;
    g.cameraPitch = 0.1;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/landscape-city-horizon.png" });
  expect(
    await page.evaluate(
      () => window.__scene!.getObjectByName("park-bird-flock")!.children.length,
    ),
  ).toBe(8);
  expect(errors).toEqual([]);
});
test("mobile garden scene loads with usable movement and inventory", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).tap();
  await page.getByRole("button", { name: "跳过片头 · E" }).tap();
  await expect
    .poll(
      () =>
        page.evaluate(() => !!window.__scene?.getObjectByName("LandscapeRoot")),
      { timeout: 20000 },
    )
    .toBeTruthy();
  await page.evaluate(() => {
    const g = window.__game!;
    g.z = 115;
    g.guards.forEach((e) => (e.hp = 0));
  });
  await page.waitForTimeout(300);
  await expect(page.getByLabel("移动摇杆")).toBeVisible();
  await page.screenshot({ path: "artifacts/landscape-mobile.png" });
  await context.close();
});
