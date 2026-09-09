import { test, expect } from "@playwright/test";
test("left mouse never captures or orbits; middle drag stops on release; FC epilogue", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards.forEach((e) => (e.hp = 0));
    g.lockedTarget = null;
    g.cameraYaw = 0;
  });
  await page.mouse.move(700, 450);
  await page.mouse.down();
  await page.mouse.move(880, 420);
  await page.mouse.up();
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  expect(await page.evaluate(() => window.__game!.cameraYaw)).toBe(0);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(700, 450, { steps: 5 });
  await page.mouse.up({ button: "middle" });
  const yaw = await page.evaluate(() => window.__game!.cameraYaw);
  expect(yaw).not.toBe(0);
  await page.mouse.move(900, 500);
  expect(await page.evaluate(() => window.__game!.cameraYaw)).toBe(yaw);
  await page.evaluate(() => {
    const g = window.__game!;
    g.zone = "office";
    g.boss.hp = 0;
    g.phase = "dialogue";
  });
  await page.getByRole("button", { name: /签署宣言/ }).click();
  await expect(
    page.getByRole("img", { name: "获得红白 FC 游戏机及手柄" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__game!.fcUnlocked)).toBe(true);
  await expect(
    page.getByText("To Be Comtinued…", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/fc-ending-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByText("To Be Comtinued…", { exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByText("To Be Comtinued…", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/fc-ending-mobile.png" });
  expect(errors).toEqual([]);
});
