import { test, expect } from "@playwright/test";

test("keyboard menus keep native Tab and Space; gameplay starts and pauses cleanly", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const start = page.getByRole("button", { name: /开始冒险/ });
  await start.focus();
  await page.keyboard.press("Tab");
  await expect(start).not.toBeFocused();
  await start.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "跳过片头 · E" }),
  ).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect
    .poll(() => page.evaluate(() => window.__game!.phase))
    .toBe("playing");
  await page.keyboard.press("Escape");
  const resume = page.getByRole("button", { name: /^继续冒险/ });
  await resume.focus();
  await page.keyboard.press("Tab");
  await expect(resume).not.toBeFocused();
  await resume.focus();
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__game!.phase))
    .toBe("playing");
  expect(await page.evaluate(() => window.__game!.jumpBuffer)).toBe(0);
  expect(errors).toEqual([]);
});

test("real jump onto a pot stays outside its collider and can walk away", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await expect(page.getByLabel("体力", { exact: true })).toBeVisible();
  await page.waitForFunction(() =>
    window.__scene?.getObjectByName("hero-model"),
  );
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards.forEach((e) => (e.hp = 0));
    g.x = -12;
    g.z = 11.4;
    g.cameraYaw = 0;
  });
  await page.keyboard.press("Space");
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => window.__game!.z), {
      intervals: [20, 30, 50],
    })
    .toBeLessThan(10.7);
  await page.keyboard.up("KeyW");
  await expect
    .poll(() => page.evaluate(() => window.__game!.grounded))
    .toBe(true);
  expect(
    await page.evaluate(() =>
      window.__game!.blocked(window.__game!.x, window.__game!.z),
    ),
  ).toBe(false);
  await page.screenshot({ path: "artifacts/qa-pot-landing.png" });
  const x = await page.evaluate(() => window.__game!.x);
  await page.keyboard.down("KeyD");
  await expect
    .poll(() => page.evaluate(() => window.__game!.x))
    .toBeGreaterThan(x + 1);
  await page.keyboard.up("KeyD");
});
