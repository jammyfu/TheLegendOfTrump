import { test, expect } from "@playwright/test";

test("low scenery stays opaque while real tall blockers fade and recover", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).dispatchEvent("click");
  await page.getByRole("button", { name: /跳过片头/ }).dispatchEvent("click");
  await page.evaluate(() => {
    Object.assign(window.__game!, { x: 13, z: 18, cameraYaw: 1.57, autoLockCooldown: 100, lockedTarget: null });
    window.__game!.guards.forEach(e => e.stun = 100);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "artifacts/qa-occlusion-scenery.png" });
  await page.evaluate(() => {
    const scene = window.__scene!;
    const root = scene.getObjectByName("camera-occluders")!;
    let template: any;
    root.traverse((node: any) => {
      if (!template && node.isMesh && node.geometry.type === "BoxGeometry" && !Array.isArray(node.material)) template = node;
    });
    const g = window.__game!, camera = window.__camera!;
    g.phase = "paused";
    const center = camera.position.clone().lerp({ x: g.x, y: 1.5, z: g.z } as any, 0.5);
    for (const [name, height] of [["qa-low", 1.5], ["qa-tall", 8]] as const) {
      const mesh = template.clone();
      mesh.visible = true;
      mesh.name = name;
      mesh.geometry = template.geometry.clone();
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox;
      mesh.scale.set(4 / (box.max.x - box.min.x), height / (box.max.y - box.min.y), 4 / (box.max.z - box.min.z));
      mesh.rotation.set(0, 0, 0);
      mesh.position.set(center.x, height / 2, center.z);
      mesh.material = template.material.clone();
      mesh.material.transparent = false;
      mesh.material.opacity = 1;
      mesh.userData = {};
      root.add(mesh);
    }
  });
  const opacity = (name: string) => page.evaluate(name => (window.__scene!.getObjectByName(name) as any).material.opacity, name);
  await expect.poll(() => opacity("qa-tall")).toBeLessThan(0.3);
  expect(await opacity("qa-low")).toBe(1);
  await page.evaluate(() => { window.__scene!.getObjectByName("qa-tall")!.position.x += 100; });
  await expect.poll(() => opacity("qa-tall")).toBe(1);
  expect(await opacity("qa-low")).toBe(1);
});
