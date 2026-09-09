import { test, expect } from "@playwright/test";
async function start(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await expect(page.getByLabel("体力", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => !!window.__scene?.getObjectByName("EquippedSword")),
    )
    .toBeTruthy();
}
const parents = (page: import("@playwright/test").Page) =>
  page.evaluate(() => ({
    sword: window.__scene!.getObjectByName("EquippedSword")!.parent!.name,
    shield: window.__scene!.getObjectByName("EquippedShield")!.parent!.name,
  }));
test("desktop controls, back equipment, jump, block, attack and mouse camera", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.evaluate(() => window.__game!.guards.forEach((g) => (g.hp = 0)));
  await expect
    .poll(() => parents(page))
    .toEqual({ sword: "TorsoPivot", shield: "TorsoPivot" });
  await page.screenshot({ path: "artifacts/adventure-equipment-back.png" });
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => window.__game!.z))
    .toBeLessThan(14);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__game!.y))
    .toBeGreaterThan(0.3);
  await expect
    .poll(() => page.evaluate(() => window.__game!.grounded))
    .toBeTruthy();
  await page.keyboard.down("KeyF");
  await expect
    .poll(() => parents(page))
    .toEqual({ sword: "TorsoPivot", shield: "LeftArmPivot" });
  await page.screenshot({ path: "artifacts/adventure-shield-block.png" });
  await page.keyboard.up("KeyF");
  await page.keyboard.press("KeyJ");
  await expect
    .poll(async () => (await parents(page)).sword, { intervals: [20, 30, 50] })
    .toBe("RightArmPivot");
  await expect.poll(async () => (await parents(page)).sword).toBe("TorsoPivot");
  const before = await page.evaluate(() => window.__game!.cameraYaw);
  await page.getByRole("button", { name: "启用鼠标视角" }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement))
    .toBeTruthy();
  await page.mouse.move(880, 430);
  await expect
    .poll(() => page.evaluate(() => window.__game!.cameraYaw))
    .not.toBe(before);
  await page.mouse.down({ button: "right" });
  await expect
    .poll(() => page.evaluate(() => window.__game!.guarding))
    .toBeTruthy();
  await page.mouse.up({ button: "right" });
  const distance = await page.evaluate(() => window.__game!.cameraDistance);
  await page.mouse.wheel(0, -200);
  await expect
    .poll(() => page.evaluate(() => window.__game!.cameraDistance))
    .toBeLessThan(distance);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "冒险暂停" })).toBeVisible();
  expect(await page.evaluate(() => !!document.pointerLockElement)).toBeFalsy();
  await page.getByRole("button", { name: "继续冒险" }).click();
  await page.evaluate(() => {
    window.__game!.zone = "office";
    window.__game!.x = 7.9;
    window.__game!.z = 0;
    window.__game!.cameraYaw = Math.PI / 2;
  });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__camera!.position.x)).toBeLessThan(
    8.6,
  );
  expect(errors).toEqual([]);
});
test("interactive props, occlusion, secret chest and complete adventure", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.evaluate(() => window.__game!.guards.forEach((g) => (g.hp = 0)));
  const place = async (x: number, z: number, y = 0) => {
    await page.evaluate(
      ([x, z, y]) => {
        const g = window.__game!;
        g.x = x;
        g.z = z;
        g.y = y;
        g.vy = 0;
        g.grounded = true;
      },
      [x, z, y],
    );
    await page.waitForTimeout(120);
  };
  await place(-3, 16);
  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("heading", { name: "南草坪探险告示" }),
  ).toBeVisible();
  await page.keyboard.press("KeyE");
  await place(17, 7.7);
  await page.keyboard.press("KeyE");
  await expect.poll(() => page.evaluate(() => window.__game!.gems)).toBe(3);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "artifacts/adventure-chest.png" });
  await page.keyboard.press("KeyE");
  expect(await page.evaluate(() => window.__game!.gems)).toBe(3);
  await place(-7, 2.7);
  await page.keyboard.press("KeyE");
  await expect
    .poll(() => page.evaluate(() => window.__game!.gateOpen))
    .toBeTruthy();
  await place(-13, -3, 0.37);
  await page.keyboard.press("KeyE");
  await expect.poll(() => page.evaluate(() => window.__game!.gems)).toBe(8);
  await place(0, -10.7);
  await page.keyboard.press("KeyE");
  await expect
    .poll(() => page.evaluate(() => window.__game!.zone))
    .toBe("office");
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => window.__game!.z), { timeout: 12000 })
    .toBeLessThan(-1.5);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("heading", { name: "新的篇章，由你书写。" }),
  ).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("heading", { name: "传奇，才刚刚开始。" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile multitouch movement + sprint + camera, held block and release cleanup", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:4439");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await page.evaluate(() => window.__game!.guards.forEach((g) => (g.hp = 0)));
  await expect(
    page.getByRole("button", { name: "跳跃", exact: true }),
  ).toBeVisible();
  const cdp = await context.newCDPSession(page);
  const box = await page.getByLabel("移动摇杆").boundingBox(),
    sprint = await page
      .getByRole("button", { name: "冲刺", exact: true })
      .boundingBox();
  const p1 = { x: box!.x + 57, y: box!.y + 57, id: 1 },
    p2 = { x: sprint!.x + 25, y: sprint!.y + 25, id: 2 },
    p3 = { x: 260, y: 260, id: 3 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [p1, p2, p3],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ ...p1, y: p1.y - 35 }, p2, { ...p3, x: 300, y: 285 }],
  });
  await expect
    .poll(() => page.evaluate(() => window.__game!.sprinting))
    .toBeTruthy();
  await expect
    .poll(() => page.evaluate(() => window.__game!.z))
    .toBeLessThan(14);
  expect(await page.evaluate(() => window.__game!.cameraYaw)).not.toBe(0);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.evaluate(() => window.__game!.sprinting))
    .toBeFalsy();
  await page.getByRole("button", { name: "跳跃", exact: true }).tap();
  await expect
    .poll(() => page.evaluate(() => window.__game!.y))
    .toBeGreaterThan(0.2);
  await expect
    .poll(() => page.evaluate(() => window.__game!.grounded))
    .toBeTruthy();
  const guard = await page
    .getByRole("button", { name: "防御", exact: true })
    .boundingBox();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: guard!.x + 25, y: guard!.y + 25, id: 4 }],
  });
  await expect
    .poll(async () => (await parents(page)).shield)
    .toBe("LeftArmPivot");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect
    .poll(async () => (await parents(page)).shield)
    .toBe("TorsoPivot");
  await page.screenshot({ path: "artifacts/adventure-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
  await context.close();
});
