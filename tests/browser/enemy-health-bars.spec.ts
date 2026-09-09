import { test, expect } from "@playwright/test";

test("enemy bars track damage, scaled health, summons and death; sun follows player", async ({ page }) => {
  await page.goto("/");
  // The title button has a continuous GSAP float animation.
  await page.getByRole("button", { name: /开始冒险/ }).click({ force: true });
  await page.getByRole("button", { name: /跳过片头/ }).click({ force: true });
  const id = await page.evaluate(() => {
    const g = window.__game!;
    const enemy = g.guards.find(e => e.sizeMultiplier === 1.5)!;
    Object.assign(g, { x: 0, z: 150, y: 0, grounded: true, yaw: 0 });
    Object.assign(enemy, { x: 0, z: 143, hp: 15, stun: 100 });
    return enemy.id;
  });
  const read = () => page.evaluate(id => {
    const scene = window.__scene!;
    const bar = scene.getObjectByName(`enemy-health-${id}`)!;
    const fill = scene.getObjectByName(`enemy-health-fill-${id}`)!;
    return { visible: bar.visible, ratio: fill.scale.x, maxHp: bar.userData.maxHp };
  }, id);
  await expect.poll(read).toEqual({ visible: true, ratio: 1, maxHp: 15 });
  await page.evaluate(id => { window.__game!.guards.find(e => e.id === id)!.hp = 5; }, id);
  await expect.poll(read).toEqual({ visible: true, ratio: 1 / 3, maxHp: 15 });
  await expect.poll(() => page.evaluate(() => {
    const sun = window.__scene!.getObjectByName("character-follow-sun")!;
    return Math.abs(sun.position.z - (window.__game!.z + 15)) < 0.1;
  })).toBe(true);
  await page.screenshot({ path: "artifacts/qa-enemy-health-shadows.png" });
  await page.evaluate(id => { window.__game!.guards.find(e => e.id === id)!.hp = 0; }, id);
  await expect.poll(async () => (await read()).visible).toBe(false);
  await page.evaluate(() => {
    const g = window.__game!;
    g.zone = "office";
    Object.assign(g, { x: 0, z: 10 });
    Object.assign(g.boss, { active: true, hp: 9, x: 0, z: -5 });
    Object.assign(g.minions[0], { hp: 4, x: -4, z: 2, stun: 100 });
  });
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__scene!;
    return [scene.getObjectByName("enemy-health-fill-100")!.scale.x,
      scene.getObjectByName("enemy-health-fill-101")!.scale.x,
      scene.getObjectByName("enemy-health-101")!.visible];
  })).toEqual([0.5, 1, true]);
});
