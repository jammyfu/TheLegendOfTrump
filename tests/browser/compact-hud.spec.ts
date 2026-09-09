import { test, expect } from "@playwright/test";
import { equipMelee } from "./fixtures";
test("task and control text stays collapsed until requested", async ({ page }) => {
  await page.goto("/");
  // Start via its click handler so the title's moving hitbox cannot race setup.
  await page.getByRole("button", { name: /开始冒险/ }).dispatchEvent("click");
  await page.getByRole("button", { name: /跳过片头/ }).dispatchEvent("click");
  await equipMelee(page);
  await page.evaluate(() => {
    const g = window.__game!;
    Object.assign(g, { x: 0, z: 155, cameraYaw: 1.57, lockedTarget: null, autoLockCooldown: 100 });
    g.guards.forEach(e => e.stun = 100);
    g.toast = "";
  });
  await expect(page.locator(".quest")).not.toBeVisible();
  await expect(page.locator(".adventure-controls")).not.toBeVisible();
  await page.getByLabel("查看任务", { exact: true }).click();
  await expect(page.locator(".quest")).toBeVisible();
  await page.getByLabel("查看任务", { exact: true }).click();
  await page.getByLabel("查看操作帮助", { exact: true }).click();
  await expect(page.locator(".adventure-controls")).toBeVisible();
  await page.getByLabel("查看操作帮助", { exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "artifacts/qa-compact-hud-gear.png" });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "artifacts/qa-compact-hud-mobile.png" });
});
