import { test, expect } from "@playwright/test";
test("title, movement, combat, pause, quest and restart", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "TRUMP", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "artifacts/title-desktop.png" });
  await page.getByRole("button", { name: "开始冒险" }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: "artifacts/intro-desktop.png" });
  await expect(page.getByText("探索南草坪，收集 8 枚翡翠")).toBeVisible();
  await expect(page.getByLabel("翡翠 0 枚")).toBeInViewport();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "artifacts/grounds-desktop.png" });
  const read = () =>
    page.evaluate(async () => {
      const game = window.__game!;
      return {
        x: game.x,
        z: game.z,
        hp: game.hp,
        gems: game.gems,
        phase: game.phase,
        zone: game.zone,
      };
    });
  const initial = await read();
  await page.keyboard.down("KeyW");
  await expect.poll(async () => (await read()).z).toBeLessThan(initial.z - 1);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("Escape");
  const paused = await read();
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(300);
  await page.keyboard.up("KeyW");
  expect((await read()).z).toEqual(paused.z);
  await page.getByRole("button", { name: "继续冒险" }).click();
  // Deterministic positions seed the scenario; pickup, sword, door and completion use real simulation/input.
  await page.evaluate(async () => {
    const game = window.__game!;
    game.x = -12;
    game.z = 12;
    game.yaw = Math.PI;
  });
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  expect((await read()).gems).toBeGreaterThanOrEqual(2);
  for (const [x, z] of [
    [-5, 12],
    [-8, 8],
    [-9, 3],
    [-7, -3],
    [-5, -9],
    [5, 12],
  ]) {
    await page.evaluate(
      async ([x, z]) => {
        const game = window.__game!;
        game.x = x;
        game.z = z;
      },
      [x, z],
    );
    await expect
      .poll(() =>
        page.evaluate(
          ([x, z]) =>
            window.__game!.items.some(
              (g) => g.x === x && g.z === z && g.collected,
            ),
          [x, z],
        ),
      )
      .toBeTruthy();
  }
  expect((await read()).gems).toBeGreaterThanOrEqual(8);
  await page.evaluate(async () => {
    const game = window.__game!;
    game.x = 0;
    game.z = -12;
  });
  await page.waitForTimeout(100);
  await page.keyboard.press("KeyE");
  await expect(page.getByText("走近书桌，签署冒险宣言")).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "artifacts/office-desktop.png" });
  await page.keyboard.down("KeyW");
  await expect
    .poll(async () => (await read()).z, { timeout: 15000 })
    .toBeLessThan(-1);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("heading", { name: "新的篇章，由你书写。" }),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "artifacts/office-dialogue.png" });
  await page.getByRole("button", { name: "签署宣言" }).click();
  await expect(
    page.getByRole("heading", { name: "传奇，才刚刚开始。" }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/complete.png" });
  await page.getByRole("button", { name: "再冒险一次" }).click();
  expect((await read()).gems).toEqual(0);
  expect((await read()).hp).toEqual(3);
  expect(errors).toEqual([]);
});
test("mobile title, joystick and action buttons", async ({ browser }) => {
  const errors: string[] = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:4439");
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "artifacts/title-mobile.png" });
  await page.getByRole("button", { name: "开始冒险" }).click();
  await expect(
    page.getByRole("button", { name: "挥剑", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.getByLabel("翡翠 0 枚")).toBeInViewport();
  await page.screenshot({ path: "artifacts/grounds-mobile.png" });
  const pad = await page.locator(".joystick").boundingBox();
  const initial = await page.evaluate(() => window.__game!.z);
  await page.mouse.move(pad!.x + 55, pad!.y + 55);
  await page.mouse.down();
  await page.mouse.move(pad!.x + 55, pad!.y + 20);
  await expect
    .poll(() => page.evaluate(() => window.__game!.z))
    .toBeLessThan(initial - 0.5);
  await page.mouse.up();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
  await context.close();
});
