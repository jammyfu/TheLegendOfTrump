import { test, expect } from "@playwright/test";
test("landing camera, helicopter turn and starter chest remain in the remote south lawn", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () => !!window.__scene?.getObjectByName("arrival-helicopter")?.visible,
        ),
      { timeout: 20000 },
    )
    .toBeTruthy();
  await page.evaluate(() => {
    const g = window.__game!;
    (window as any).__resumeUpdate = g.update;
    g.update = () => {};
    g.introTime = 10;
  });
  await page.waitForTimeout(350);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__scene!.getObjectByName("arrival-helicopter")!.position.z,
      ),
      { timeout: 20000 },
    )
    .toBeCloseTo(183, 4);
  const landing = await page.evaluate(() => {
    const h = window.__scene!.getObjectByName("arrival-helicopter")!;
    return { x: h.position.x, yaw: h.rotation.y };
  });
  expect(landing.x).toBe(8);
  expect(landing.yaw).toBeCloseTo(Math.PI);
  await page.screenshot({ path: "artifacts/expedition-landing.png" });
  await page.evaluate(() => {
    window.__game!.introTime = 6;
  });
  await expect.poll(() => page.evaluate(() => window.__scene!.getObjectByName("arrival-helicopter")!.rotation.y)).toBeGreaterThan(Math.PI);
  const turn = await page.evaluate(
    () => window.__scene!.getObjectByName("arrival-helicopter")!.rotation.y,
  );
  expect(turn).toBeGreaterThan(Math.PI);
  expect(turn).toBeLessThan(2 * Math.PI);
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await page.evaluate(() => {
    const g = window.__game!;
    g.update = (window as any).__resumeUpdate;
    g.x = 5;
    g.z = 176;
  });
  await page.keyboard.press("KeyE");
  await expect
    .poll(() => page.evaluate(() => window.__game!.opened.has("chest-landing")))
    .toBe(true);
  await expect(page.getByLabel("金币 8", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.__game!.hp = 1;
  });
  await page.keyboard.press("KeyH");
  await expect.poll(() => page.evaluate(() => window.__game!.hp)).toBe(3);
  await page.screenshot({ path: "artifacts/expedition-south-lawn.png" });
  expect(errors).toEqual([]);
});
test("archer and armored camp models have distinct equipment and readable attack poses", async ({
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
        page.evaluate(
          () => !!window.__scene?.getObjectByName("expedition-map"),
        ),
      { timeout: 20000 },
    )
    .toBeTruthy();
  await page.evaluate(() => {
    const g = window.__game!;
    g.update = () => {};
    g.x = -38;
    g.z = 138;
    g.cameraYaw = 0;
    g.guards[3].windup = 0.8;
    g.guards[3].yaw = 0;
  });
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(
      () =>
        !!window
          .__scene!.getObjectByName("guard-3")
          ?.getObjectByName("ArcherBow"),
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/expedition-archer-camp.png" });
  await page.evaluate(() => {
    const g = window.__game!;
    g.x = -54;
    g.z = 61;
    g.guards[8].windup = 1;
    g.guards[8].yaw = 0;
  });
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(
      () =>
        !!window
          .__scene!.getObjectByName("guard-8")
          ?.getObjectByName("Heavy_hammer_head"),
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/expedition-heavy-camp.png" });
  expect(errors).toEqual([]);
});
test("mobile expedition inventory supports potion use without obscuring movement", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).tap();
  await page.getByRole("button", { name: "跳过片头 · E" }).tap();
  await page.evaluate(() => {
    window.__game!.hp = 1;
    window.__game!.potions = 1;
    window.__game!.coins = 24;
  });
  const potion = page.getByRole("button", { name: "使用回复药，剩余 1 瓶" });
  await expect(potion).toBeVisible();
  await potion.tap();
  await expect.poll(() => page.evaluate(() => window.__game!.hp)).toBe(3);
  await page.screenshot({ path: "artifacts/expedition-mobile.png" });
  await ctx.close();
});
