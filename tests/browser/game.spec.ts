import { test, expect } from "@playwright/test";
async function start(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await expect(page.getByLabel("体力", { exact: true })).toBeVisible();
  // Legacy control/combat fixtures stay in the forecourt; expedition tests cover remote spawn.
  await page.evaluate(() => {
    window.__game!.x = 0;
    window.__game!.z = 15;
  });
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
    .toEqual({ sword: "RightWristPivot", shield: "LeftWristPivot" });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const sword = window.__scene!.getObjectByName("EquippedSword")!;
        sword.updateWorldMatrix(true, false);
        const e = sword.matrixWorld.elements;
        return e[5] / Math.hypot(e[4], e[5], e[6]);
      }),
    )
    .toBeGreaterThan(0.98);
  await page.screenshot({ path: "artifacts/adventure-shield-block.png" });
  await page.keyboard.up("KeyF");
  await page.keyboard.press("KeyJ");
  await expect
    .poll(async () => (await parents(page)).sword, { intervals: [20, 30, 50] })
    .toBe("RightWristPivot");
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
    window.__game!.x = 17.0;
    window.__game!.z = 0;
    window.__game!.cameraYaw = Math.PI / 2;
  });
  await page.waitForTimeout(800);
  expect(
    await page.evaluate(() => {
      const g = window.__game!,
        c = window.__camera!;
      return (
        g.blocked(18.45, 0) &&
        Math.hypot(c.position.x - g.x, c.position.z - g.z) > 5
      );
    }),
  ).toBeTruthy();
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
  await page.evaluate(() => {
    window.__game!.boss.hp = 0;
    window.__game!.lockedTarget = null;
    window.__game!.cameraYaw = 0;
  }); // Isolate traversal; boss is covered below.
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => window.__game!.z), { timeout: 12000 })
    .toBeLessThan(-4.8);
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
  const initialZ = await page.evaluate(() => window.__game!.z);
  const cdp = await context.newCDPSession(page);
  const box = await page.getByLabel("移动摇杆").boundingBox();
  const p1 = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2, id: 1 },
    p3 = { x: 260, y: 260, id: 3 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [p1, p3],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { ...p1, y: p1.y - 50 },
      { ...p3, x: 300, y: 285 },
    ],
  });
  await expect
    .poll(() => page.evaluate(() => window.__game!.sprinting))
    .toBeTruthy();
  await expect
    .poll(() => page.evaluate(() => window.__game!.z))
    .toBeLessThan(initialZ - 1);
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
    .toBe("LeftWristPivot");
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
  await page.evaluate(() => {
    const g = window.__game!;
    g.gems = 8;
    g.x = 0;
    g.z = -10.7;
    g.interact();
    g.x = 0;
    g.z = 1.5;
    g.yaw = Math.PI;
    g.cameraYaw = 0.3;
    g.boss.state = "recover";
    g.boss.timer = 100;
  });
  await expect(page.getByLabel("Boss 战", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => !!window.__scene?.getObjectByName("BossRoot")),
    )
    .toBeTruthy();
  await page.getByRole("button", { name: "挥剑", exact: true }).tap();
  await expect
    .poll(() => page.evaluate(() => window.__game!.boss.hp))
    .toBeLessThan(18);
  await page.screenshot({ path: "artifacts/oval-boss-mobile.png" });
  const attackButton = await page
    .getByRole("button", { name: "挥剑", exact: true })
    .boundingBox();
  const touch = { x: attackButton!.x + 25, y: attackButton!.y + 25, id: 5 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touch],
  });
  await expect
    .poll(() => page.evaluate(() => window.__game!.chargeTime))
    .toBe(1.2);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  expect(await page.evaluate(() => window.__game!.spinTime)).toBe(0);
  expect(await page.evaluate(() => window.__game!.chargeTime)).toBe(0);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touch],
  });
  await expect
    .poll(() => page.evaluate(() => window.__game!.chargeTime))
    .toBe(1.2);
  const hpBeforeSpin = await page.evaluate(() => window.__game!.boss.hp);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.evaluate(() => window.__game!.boss.hp), {
      intervals: [20, 30, 50],
    })
    .toBe(hpBeforeSpin - 2);
  await page.evaluate(() => {
    window.__game!.hitStop = 100;
  });
  await page.screenshot({ path: "artifacts/spin-mobile.png" });

  expect(errors).toEqual([]);
  await context.close();
});

test("jointed three-hit combo animates wrists and visibly staggers an enemy", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const g = window.__game!;
    g.x = 0;
    g.z = 12;
    g.yaw = Math.PI;
    g.cameraYaw = 0.6;
    g.cameraDistance = 9;
    Object.assign(g.guards[0], { x: 0, z: 10, hp: 3, cooldown: 5 });
    g.guards[1].hp = 0;
  });
  await page.keyboard.press("KeyJ");
  for (let stage = 0; stage < 3; stage++) {
    await expect
      .poll(() => page.evaluate(() => window.__game!.combo))
      .toBe(stage);
    await expect
      .poll(() => page.evaluate(() => window.__game!.guards[0].hp), {
        intervals: [20, 30, 50],
      })
      .toBe(2 - stage);
    if (stage < 2) await page.keyboard.press("KeyJ");
    await page.evaluate(() => {
      window.__game!.hitStop = 100;
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          Math.abs(window.__scene!.getObjectByName("guard-0")!.rotation.x),
        ),
      )
      .toBeGreaterThan(0.05);
    const pose = await page.evaluate(() => ({
      wrist: window.__scene!.getObjectByName("EquippedSword")!.parent!.name,
      elbow: window.__scene!.getObjectByName("RightElbowPivot")!.rotation.x,
      waist: window.__scene!.getObjectByName("WaistPivot")!.rotation.y,
      recoil: window.__scene!.getObjectByName("guard-0")!.rotation.x,
      stun: window.__game!.guards[0].stun,
    }));
    expect(pose.wrist).toBe("RightWristPivot");
    expect(Math.abs(pose.elbow)).toBeGreaterThan(0.1);
    expect(Math.abs(pose.recoil)).toBeGreaterThan(0.05);
    expect(pose.stun).toBeGreaterThan(0);
    await page.screenshot({ path: `artifacts/combo-${stage + 1}.png` });
    await page.evaluate(() => {
      window.__game!.hitStop = 0;
    });
  }
  await expect
    .poll(() => page.evaluate(() => window.__game!.guards[0].defeatTime))
    .toBe(0);
  await expect.poll(async () => (await parents(page)).sword).toBe("TorsoPivot");
});

test("first left click attacks, camera settings persist and portrait view expands", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => window.__game!.guards.forEach((g) => (g.hp = 0)));
  const stamina = await page.evaluate(() => window.__game!.stamina);
  await page.locator("canvas").click({ position: { x: 700, y: 400 } });
  await expect
    .poll(() => page.evaluate(() => window.__game!.stamina))
    .toBeLessThan(stamina);
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement))
    .toBeTruthy();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByText("视角与鼠标设置", { exact: true }).click();
  await page.getByRole("slider", { name: "视野角度" }).fill("75");
  await page.getByRole("slider", { name: "镜头距离" }).fill("12");
  await page.getByRole("checkbox", { name: "反转垂直视角" }).check();
  await page.screenshot({ path: "artifacts/camera-settings.png" });
  await page.reload();
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__game!.cameraSettings))
    .toMatchObject({ distance: 12, fov: 75, invertY: true });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window.__camera as import("three").PerspectiveCamera).fov,
      ),
    )
    .toBe(75);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window.__camera as import("three").PerspectiveCamera).fov,
      ),
    )
    .toBeGreaterThan(85);
  // A browser denying pointer lock must not disable attacks.
  await page.evaluate(() => {
    document.querySelector("canvas")!.requestPointerLock = () =>
      Promise.reject(new Error("Denied"));
  });
  const before = await page.evaluate(() => window.__game!.stamina);
  await page.locator("canvas").click({ position: { x: 195, y: 400 } });
  await expect
    .poll(() => page.evaluate(() => window.__game!.stamina))
    .toBeLessThan(before);
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
});

test("helicopter has proportional fuselage, working door and articulated rotors", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const probe: {
      oscillators: OscillatorNode[];
      gains: GainNode[];
      rotorGain?: AudioParam;
    } = {
      oscillators: [],
      gains: [],
    };
    (window as unknown as { audioProbe: typeof probe }).audioProbe = probe;
    const target = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (value, time, constant) {
      if (value === 0.28) probe.rotorGain = this;
      return target.call(this, value, time, constant);
    };
    const oscillator = AudioContext.prototype.createOscillator;
    const gain = AudioContext.prototype.createGain;
    AudioContext.prototype.createOscillator = function () {
      const node = oscillator.call(this);
      probe.oscillators.push(node);
      return node;
    };
    AudioContext.prototype.createGain = function () {
      const node = gain.call(this);
      probe.gains.push(node);
      return node;
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => !!window.__scene?.getObjectByName("ArrivalAircraft")),
    )
    .toBeTruthy();
  await page.evaluate(() => {
    window.__game!.introTime = 11.3;
    window.__game!.update = () => {};
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__scene!.getObjectByName("arrival-helicopter")!.visible,
      ),
    )
    .toBeTruthy();
  const before = await page.evaluate(
    () => window.__scene!.getObjectByName("ArrivalRotor")!.rotation.y,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__scene!.getObjectByName("ArrivalRotor")!.rotation.y,
      ),
    )
    .not.toBe(before);
  await page.waitForTimeout(500);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__scene!.getObjectByName("ArrivalStairs")?.scale.x,
      ),
    )
    .toBe(1);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const probe = (
          window as unknown as {
            audioProbe: {
              oscillators: OscillatorNode[];
              gains: GainNode[];
              rotorGain?: AudioParam;
            };
          }
        ).audioProbe;
        return (
          [18, 82, 123].every((f) =>
            probe.oscillators.some(
              (o) => o.frequency.value === f && o.context.state === "running",
            ),
          ) && (probe.rotorGain?.value ?? 0) > 0.1
        );
      }),
    )
    .toBeTruthy();
  await page.screenshot({ path: "artifacts/helicopter-arrival.png" });
  await page.evaluate(() => {
    window.__game!.introTime = 9.5;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__scene!.getObjectByName("ArrivalDoor")!.position.z,
      ),
    )
    .toBeLessThan(-0.7);
  for (const remaining of [15, 8]) {
    await page.evaluate((remaining) => {
      window.__game!.introTime = remaining;
    }, remaining);
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__scene!.getObjectByName("ArrivalStairs")!.visible,
        ),
      )
      .toBe(false);
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__scene!.getObjectByName("ArrivalDoor")!.position.z,
        ),
      )
      .toBeCloseTo(0.7);
  }
  await page.getByRole("button", { name: "跳过片头 · E" }).click();
  await expect(page.getByLabel("体力", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { audioProbe: { rotorGain?: AudioParam } })
            .audioProbe.rotorGain?.value,
      ),
    )
    .toBeLessThan(0.001);
});

test("oval arena boss telegraphs, blocks, enrages and unlocks the desk after defeat", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.evaluate(() => {
    const g = window.__game!;
    g.gems = 8;
    g.summonWaves = 2;
    g.x = 0;
    g.z = -10.7;
  });
  await page.keyboard.press("KeyE");
  await expect(page.getByLabel("Boss 战", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => !!window.__scene?.getObjectByName("OfficeFurnishing"),
      ),
    )
    .toBeTruthy();
  await page.evaluate(() => {
    const g = window.__game!;
    g.x = 0;
    g.z = 2.5;
    g.yaw = Math.PI;
    g.cameraYaw = 0.35;
    g.summonWaves = 2; // Summons have their own end-to-end test.
    g.boss.timer = 0;
  });
  await page.keyboard.down("KeyF");
  await expect
    .poll(() => page.evaluate(() => window.__game!.boss.state))
    .toBe("windup");
  await page.evaluate(() => {
    window.__game!.hitStop = 100;
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = window.__scene?.getObjectByName("guard-100");
        const body = window.__scene?.getObjectByName("BossBreastplate") as
          import("three").Mesh | undefined;
        return (
          !!root?.visible &&
          !!body &&
          (!Array.isArray(body.material) || body.geometry.groups.length > 0)
        );
      }),
    )
    .toBeTruthy();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const c = window.__camera!,
          g = window.__game!;
        const feet = c.position.clone().set(g.x, 0, g.z).project(c);
        const head = c.position.clone().set(g.x, 2.85, g.z).project(c);
        return head.y - feet.y;
      }),
    )
    .toBeLessThan(0.8);
  await page.screenshot({ path: "artifacts/oval-boss-arena.png" });
  await page.evaluate(() => {
    window.__game!.hitStop = 0;
  });
  await expect
    .poll(() => page.evaluate(() => window.__game!.stamina))
    .toBeLessThan(90);
  expect(await page.evaluate(() => window.__game!.hp)).toBe(3);
  await page.keyboard.up("KeyF");
  // Repeat real attacks in controlled recovery poses; full AI timing and dodge
  // behaviors are covered by the deterministic boss tests.
  for (let hit = 0; hit < 18; hit++) {
    const before = await page.evaluate(() => {
      const g = window.__game!;
      g.boss.x = 0;
      g.boss.z = 0;
      g.boss.state = "recover";
      g.boss.timer = 5;
      g.x = 0;
      g.z = 2;
      g.yaw = Math.PI;
      g.stamina = 100;
      return g.boss.hp;
    });
    if (before === 0) break;
    await expect
      .poll(() => page.evaluate(() => window.__game!.cooldown))
      .toBe(0);
    await page.keyboard.press("KeyJ");
    await expect
      .poll(() => page.evaluate(() => window.__game!.boss.hp), {
        intervals: [30, 50, 80],
      })
      .toBeLessThan(before);
    if (before === 10) await expect(page.getByText(/过载阶段/)).toBeVisible();
  }
  await expect.poll(() => page.evaluate(() => window.__game!.boss.hp)).toBe(0);
  await expect(page.getByLabel("Boss 战", { exact: true })).toBeHidden();
  await page.evaluate(() => {
    const g = window.__game!;
    g.x = 0;
    g.z = -7.25;
  });
  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("heading", { name: "新的篇章，由你书写。" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("hold left mouse charges, releases one radial spin and clears its effects", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards = g.guards.slice(0, 2);
    g.guards.forEach((e) => (e.hp = 0));
    g.x = 0;
    g.z = 12;
    g.yaw = Math.PI;
  });
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => window.__game!.chargeTime))
    .toBe(1.2);
  await expect(page.getByLabel("蓄力旋转斩", { exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/sword-charge.png" });
  await page.evaluate(() => {
    const g = window.__game!;
    g.guards.forEach((e, i) =>
      Object.assign(e, {
        hp: 3,
        x: g.x + (i ? 2.5 : -2.5),
        z: g.z,
        stun: 10,
        stunDuration: 10,
        cooldown: 10,
      }),
    );
  });
  const yaw = await page.evaluate(() => window.__game!.cameraYaw);
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => window.__game!.guards.map((e) => e.hp)), {
      intervals: [20, 30, 50],
    })
    .toEqual([1, 1]);
  await page.evaluate(() => {
    window.__game!.hitStop = 100;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__scene!.getObjectByName("charge-spin-effects")!.visible,
      ),
    )
    .toBeTruthy();
  await page.screenshot({ path: "artifacts/spin-attack.png" });
  expect(await page.evaluate(() => window.__game!.cameraYaw)).toBe(yaw);
  await page.evaluate(() => {
    window.__game!.hitStop = 0;
  });
  await expect.poll(() => page.evaluate(() => window.__game!.spinTime)).toBe(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__scene!.getObjectByName("charge-spin-effects")!.visible,
      ),
    )
    .toBeFalsy();
  expect(
    await page.evaluate(() => window.__game!.guards.map((e) => e.hp)),
  ).toEqual([1, 1]);
  await page.evaluate(() => window.__game!.guards.forEach((e) => (e.hp = 0)));
  await page.keyboard.down("KeyJ");
  await expect
    .poll(() => page.evaluate(() => window.__game!.chargeTime))
    .toBeGreaterThan(0.1);
  await page.keyboard.press("Escape");
  await page.keyboard.up("KeyJ");
  expect(
    await page.evaluate(() => ({
      charge: window.__game!.chargeTime,
      spin: window.__game!.spinTime,
    })),
  ).toEqual({ charge: 0, spin: 0 });
});
