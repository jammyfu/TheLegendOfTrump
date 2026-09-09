import { test, expect } from "@playwright/test";
test("unlock stops residual mouse motion; directional combat roll and sprint jump", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await page.waitForFunction(
    () => !!window.__scene?.getObjectByName("LandscapeRoot"),
  );
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards.forEach((e) => (e.hp = 0));
    g.x = 0;
    g.z = 170;
    g.lockedTarget = 0;
    g.toggleLock();
  });
  const before = await page.evaluate(() => [
    window.__game!.cameraYaw,
    window.__game!.cameraPitch,
  ]);
  await page
    .locator("canvas")
    .dispatchEvent("mousemove", { movementX: 200, movementY: 100, buttons: 0 });
  expect(
    await page.evaluate(() => [
      window.__game!.cameraYaw,
      window.__game!.cameraPitch,
    ]),
  ).toEqual(before);
  const delayedRelease = await page.evaluate(async () => {
    const input = await import(
      /* @vite-ignore */ "/src/game/input.ts" as string
    );
    const canvas = document.querySelector("canvas")!;
    const original = canvas.requestPointerLock;
    let locked: Element | null = null;
    let finish!: () => void;
    const old = Object.getOwnPropertyDescriptor(document, "pointerLockElement");
    const exit = document.exitPointerLock;
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      get: () => locked,
    });
    document.exitPointerLock = () => {
      locked = null;
      document.dispatchEvent(new Event("pointerlockchange"));
    };
    canvas.requestPointerLock = () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      });
    input.requestMouseLook();
    input.releaseMouse();
    locked = canvas;
    document.dispatchEvent(new Event("pointerlockchange"));
    finish();
    await Promise.resolve();
    const released = locked === null;
    canvas.requestPointerLock = original;
    document.exitPointerLock = exit;
    if (old) Object.defineProperty(document, "pointerLockElement", old);
    else Reflect.deleteProperty(document, "pointerLockElement");
    return released;
  });
  expect(delayedRelease).toBe(true);
  await page.keyboard.down("Shift");
  await page.keyboard.down("KeyW");
  await page.keyboard.press("Space");
  expect(await page.evaluate(() => window.__game!.dodgeTime)).toBeGreaterThan(
    0,
  );
  expect(await page.evaluate(() => window.__game!.vy)).toBeGreaterThan(0);
  await page.keyboard.up("KeyW");
  await page.keyboard.up("Shift");
  await expect
    .poll(() => page.evaluate(() => window.__game!.grounded))
    .toBe(true);
  await page.evaluate(() => {
    const g = window.__game!;
    g.x = -20;
    g.z = 15;
    g.cameraYaw = 0;
    g.stamina = 100;
    Object.assign(g.guards[0], { hp: 3, x: -20, z: 8, stun: 100 });
    g.lockedTarget = 0;
  });
  await page.keyboard.down("KeyD");
  expect(await page.evaluate(() => window.__game!.dodgeTime)).toBeGreaterThan(
    0,
  );
  await page.screenshot({ path: "artifacts/directional-air-roll.png" });
  await page.keyboard.up("KeyD");
  expect(errors).toEqual([]);
});
test("helicopter handoff and wall-side gameplay cameras stay outside collision volumes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.waitForFunction(
    () => !!window.__scene?.getObjectByName("arrival-helicopter"),
  );
  for (const elapsed of [9.9, 10.1, 11, 12, 14, 17]) {
    await page.evaluate((t) => {
      window.__game!.introTime = 18 - t;
    }, elapsed);
    await page.waitForTimeout(120);
    const inside = await page.evaluate(async () => {
      const { introPose } = await import(
        /* @vite-ignore */ "/src/game/intro.ts" as string
      );
      const p = introPose(window.__game!.introTime),
        c = window.__camera!.position;
      return (
        c.y > p.helicopter[1] - 0.6 &&
        c.y < p.helicopter[1] + 8 &&
        Math.hypot(c.x - p.helicopter[0], c.z - p.helicopter[2]) < 8.6
      );
    });
    expect(inside).toBe(false);
  }
  await page.screenshot({ path: "artifacts/helicopter-safe-handoff.png" });
  await page.evaluate(() => {
    if (window.__game!.phase === "intro") window.__game!.skipIntro();
  });
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards.forEach((e) => (e.hp = 0));
    g.x = 0;
    g.z = -10;
    g.cameraYaw = Math.PI;
    g.cameraPitch = 0.15;
  });
  await page.waitForTimeout(200);
  const overlaps = await page.evaluate(async () => {
    const { rayFraction } = await import(
      /* @vite-ignore */ "/src/game/collision.ts" as string
    );
    const g = window.__game!,
      p = window.__camera!.position;
    return g.colliders
      .filter(
        (c) => !c.id.startsWith("guard-") && rayFraction(c, p, p, 0.4) !== null,
      )
      .map((c) => c.id);
  });
  expect(overlaps).toEqual([]);
});
