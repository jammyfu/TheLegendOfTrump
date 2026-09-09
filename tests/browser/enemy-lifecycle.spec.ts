import { test, expect } from "@playwright/test";
test("larger enemies fall and fade; hero falls before the retry screen", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await page.waitForFunction(() =>
    window.__scene?.getObjectByName("hero-model"),
  );
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards.forEach((e) => (e.hp = 0));
    g.x = -20;
    g.z = 15;
    g.cameraYaw = 0;
    Object.assign(g.guards[0], { hp: 3, x: -20, z: 11, stun: 100 });
  });
  await page.waitForTimeout(800);
  expect(
    await page.evaluate(
      () => window.__scene!.getObjectByName("guard-0")!.children[0].scale.x,
    ),
  ).toBe(1.22);
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards[0].hp = 0;
    g.guards[0].defeatTime = 1.5;
    Reflect.set(window, "resumeSimulation", g.update);
    g.update = () => {};
  });
  await page.waitForTimeout(120);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__scene!.getObjectByName("guard-0")!.rotation.z,
      ),
    )
    .toBeGreaterThan(1.4);
  await page.screenshot({ path: "artifacts/enemy-fallen.png" });
  await page.evaluate(() => {
    const g = window.__game!;
    g.update = Reflect.get(window, "resumeSimulation");
    g.guards[0].defeatTime = 0.1;
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__scene!.getObjectByName("guard-0")!.visible),
    )
    .toBe(false);
  await page.evaluate(() => {
    const g = window.__game!;
    g.hp = 1;
    g.invincible = 0;
    Object.assign(g.guards[0], {
      hp: 3,
      x: -20,
      z: 13.5,
      yaw: 0,
      stun: 0,
      windup: 0.01,
    });
  });
  await expect
    .poll(() => page.evaluate(() => window.__game!.phase))
    .toBe("dying");
  await expect(page.getByRole("button", { name: /再冒险一次/ })).toHaveCount(0);
  await page.evaluate(() => {
    const g = window.__game!;
    g.deathTime = 1.3;
    Reflect.set(window, "resumeSimulation", g.update);
    g.update = () => {};
  });
  await page.waitForTimeout(120);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__scene!.getObjectByName("hero-model")!.rotation.z,
      ),
    )
    .toBeLessThan(-1.4);
  await page.screenshot({ path: "artifacts/hero-defeat-process.png" });
  await page.evaluate(
    () => (window.__game!.update = Reflect.get(window, "resumeSimulation")),
  );
  await expect(page.getByRole("button", { name: /再冒险一次/ })).toBeVisible();
  await page.getByRole("button", { name: /再冒险一次/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.__game!.phase))
    .toBe("playing");
  expect(await page.evaluate(() => window.__game!.hp)).toBe(3);
  expect(errors).toEqual([]);
});
