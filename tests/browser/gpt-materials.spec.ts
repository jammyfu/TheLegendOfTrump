import { test, expect } from "@playwright/test";
import { equipMelee } from "./fixtures";
test("GPT Image color and roughness maps load on game meshes", async ({ page }) => {
  const failed: string[] = [];
  page.on("response", r => { if (r.url().includes("/textures/") && r.status() >= 400) failed.push(r.url()); });
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).dispatchEvent("click");
  await page.getByRole("button", { name: /跳过片头/ }).dispatchEvent("click");
  await equipMelee(page);
  await page.evaluate(() => {
    Object.assign(window.__game!, { x: 0, z: 145, autoLockCooldown: 100, lockedTarget: null });
    window.__game!.guards.forEach(e => e.stun = 100);
  });
  await expect.poll(() => page.evaluate(() => {
    const maps = new Set<string>();
    window.__scene!.traverse((n: any) => {
      if (!n.isMesh) return;
      for (const m of Array.isArray(n.material) ? n.material : [n.material]) {
        if (m.map?.name.startsWith("GPTImage_") && m.map.image?.complete && m.roughnessMap?.image?.complete && n.geometry.getAttribute("uv")) maps.add(m.map.name);
      }
    });
    return maps.size;
  }), { timeout: 20000 }).toBeGreaterThanOrEqual(8);
  expect(failed).toEqual([]);
  await page.waitForTimeout(600);
  await page.screenshot({ path: "artifacts/qa-gpt-materials.png" });
});
