import { test, expect } from "@playwright/test";
test("mown lawn uses meter-scaled grass, with no missing new textures", async ({ page }) => {
  const failures: string[] = [];
  page.on("response", r => { if (r.url().includes("/textures/") && r.status() >= 400) failures.push(r.url()); });
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).dispatchEvent("click");
  await page.getByRole("button", { name: /跳过片头/ }).dispatchEvent("click");
  await expect.poll(() => page.evaluate(() => {
    let valid = false;
    window.__scene?.traverse((node: any) => {
      if (/mown.lawn.stripe/i.test(node.name) && node.isMesh) valid = node.geometry.userData.surfaceUV?.meters === 4 && node.material.userData.surface === "grass" && node.material.map?.image?.complete;
    });
    return valid;
  }), { timeout: 30000 }).toBe(true);
  await page.evaluate(() => {
    const g = window.__game!;
    Object.assign(g, { x: 0, z: 140, cameraYaw: 0, lockedTarget: null, autoLockCooldown: 100 });
    g.guards.forEach(e => e.stun = 100);
  });
  await page.waitForTimeout(700);
  expect(failures).toEqual([]);
  await page.screenshot({ path: "artifacts/qa-balanced-materials.png" });
});
