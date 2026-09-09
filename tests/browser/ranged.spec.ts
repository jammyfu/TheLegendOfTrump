import { test, expect } from "@playwright/test";
async function start(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await expect(page.getByLabel("切换武器")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => !!window.__scene?.getObjectByName("EquippedBow")),
    )
    .toBeTruthy();
}
test("chest bow, visible lock, drawn joints and real mouse shot", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.evaluate(() => {
    const g = window.__game!;
    g.x = 17;
    g.z = 7.7;
    g.interact();
    g.x = 0;
    g.z = 12;
    Object.assign(g.guards[0], {
      x: 0,
      z: 6,
      originX: 0,
      originZ: 6,
      cooldown: 20,
    });
    g.guards[1].hp = 0;
  });
  await page.keyboard.press("KeyX");
  await page.keyboard.press("KeyQ");
  await expect(page.getByLabel("锁定准星")).toBeVisible();
  await page.mouse.move(760, 500);
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => window.__game!.bowDraw))
    .toBeGreaterThan(0.8);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__scene!.getObjectByName("EquippedBow")!.parent!.name,
      ),
    )
    .toBe("LeftWristPivot");
  await page.screenshot({ path: "artifacts/bow-lock-draw.png" });
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => window.__game!.guards[0].hp))
    .toBe(1);
  await expect.poll(() => page.evaluate(() => window.__game!.arrows)).toBe(15);
  expect(errors).toEqual([]);
});
test("expanded interior, boss summon telegraph and two modeled minions", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const g = window.__game!;
    g.gems = 8;
    g.x = 0;
    g.z = -10.7;
    g.interact();
    g.boss.hp = 12;
    g.boss.state = "chase";
    g.bowUnlocked = true;
    g.arrows = 12;
    g.switchWeapon();
    g.toggleLock();
  });
  await expect
    .poll(() => page.evaluate(() => window.__game!.summonTime))
    .toBeGreaterThan(0);
  await expect(page.getByLabel("锁定准星")).toBeVisible();
  await page.screenshot({ path: "artifacts/expanded-hall-summon.png" });
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__game!.minions.filter((g) => g.hp > 0).length,
        ),
      { timeout: 20000 },
    )
    .toBe(2);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__scene!.getObjectByName("guard-101")!.visible,
      ),
    )
    .toBeTruthy();
  await page.keyboard.press("Tab");
  await expect
    .poll(() => page.evaluate(() => window.__game!.lockedTarget))
    .toBe(101);
  await page.screenshot({ path: "artifacts/boss-summoned-guards.png" });
});
test("mobile weapon switch and hold-to-shoot preserve virtual controls", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await page.evaluate(() => {
    const g = window.__game!;
    g.bowUnlocked = true;
    g.arrows = 10;
    g.guards.forEach((a) => (a.hp = 0));
  });
  await page.getByLabel("切换武器").click();
  await expect(page.getByLabel("弓箭准星")).toBeVisible();
  await page.screenshot({ path: "artifacts/bow-mobile-layout.png" });
  const button = await page.getByLabel("射箭").boundingBox();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: button!.x + button!.width / 2, y: button!.y + button!.height / 2 },
    ],
  });
  await expect
    .poll(() => page.evaluate(() => window.__game!.bowDraw))
    .toBeGreaterThan(0.5);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(() => page.evaluate(() => window.__game!.arrows)).toBe(9);
  await page.getByLabel("切换武器").click();
  await expect
    .poll(() => page.evaluate(() => window.__game!.weapon))
    .toBe("sword");
  await context.close();
});
