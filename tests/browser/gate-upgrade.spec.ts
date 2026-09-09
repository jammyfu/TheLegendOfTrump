import { test, expect } from "@playwright/test";

test("garden upgrade and squad render without WebGL errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: /跳过片头/ }).click();
  await expect(page.getByLabel("体力", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const game = window.__game!;
    return {
      hedge: game.colliders.filter((c) => c.id.startsWith("hedge-") && c.z === -5).every((c) => c.top === 3.6),
      squad: game.guards.filter((g) => Math.abs(g.x) < 25 && Math.abs(g.z) < 10).length,
      captain: game.guards.some((g) => g.sizeMultiplier === 1.5),
    };
  })).toEqual({ hedge: true, squad: 6, captain: true });
  await page.screenshot({ path: "artifacts/qa-gate-upgrade.png" });
  expect(errors).toEqual([]);
});
