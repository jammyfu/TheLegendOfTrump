import { test, expect } from "@playwright/test";
test("200 stamina and sprint-direction roll chords in both keyboard orders", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await expect(page.getByLabel("体力", { exact: true })).toHaveAttribute(
    "max",
    "200",
  );
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards.forEach((e) => (e.hp = 0));
    g.x = -20;
    g.z = 15;
  });
  await page.keyboard.down("KeyD");
  await expect
    .poll(() => page.evaluate(() => window.__game!.x))
    .toBeGreaterThan(-19.5);
  expect(await page.evaluate(() => window.__game!.dodgeTime)).toBe(0);
  await page.keyboard.down("ShiftLeft");
  await expect
    .poll(() => page.evaluate(() => window.__game!.dodgeTime), {
      intervals: [20, 30, 50],
    })
    .toBeGreaterThan(0);
  await page.keyboard.up("KeyD");
  await page.keyboard.up("ShiftLeft");
  await expect
    .poll(() => page.evaluate(() => window.__game!.grounded && window.__game!.dodgeTime === 0))
    .toBe(true);
  await page.keyboard.down("ShiftLeft");
  await page.keyboard.down("KeyA");
  await expect
    .poll(() => page.evaluate(() => window.__game!.dodgeTime), {
      intervals: [20, 30, 50],
    })
    .toBeGreaterThan(0);
  await page.keyboard.up("KeyA");
  await page.keyboard.up("ShiftLeft");
  await expect
    .poll(() => page.evaluate(() => window.__game!.grounded && window.__game!.dodgeTime === 0))
    .toBe(true);
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__game!.y), {
      intervals: [20, 30, 50],
    })
    .toBeGreaterThan(0.2);
  expect(await page.evaluate(() => window.__game!.dodgeTime)).toBe(0);
  expect(errors).toEqual([]);
});
