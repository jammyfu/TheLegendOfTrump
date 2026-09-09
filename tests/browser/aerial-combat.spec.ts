import { test, expect } from "@playwright/test";
test("airborne sword and unarmed attacks have distinct joint poses", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /开始冒险/ }).dispatchEvent("click");
  await page.getByRole("button", { name: /跳过片头/ }).dispatchEvent("click");
  await expect.poll(() => page.evaluate(() => !!window.__scene?.getObjectByName("RightLegPivot")), { timeout: 30000 }).toBe(true);
  for (const sword of [false, true]) {
    await page.evaluate(sword => {
      const g = window.__game!;
      Object.assign(g, { phase: "playing", x: 0, z: 145, y: 1.4, grounded: false, vy: 0,
        weapon: sword ? "sword" : "none", swordUnlocked: sword, shieldUnlocked: sword,
        attackTime: 0, cooldown: 0, airAttack: null, airAttackUsed: false,
        autoLockCooldown: 100, lockedTarget: null, cameraYaw: 1.1 });
      g.guards.forEach(e => e.stun = 100);
      g.attack();
      g.attackTime = g.meleeSpec.duration - (sword ? 0.28 : 0.23);
      g.phase = "paused";
    }, sword);
    await expect.poll(() => page.evaluate(() => window.__game!.airAttack)).toBe(sword ? "jumpSlash" : "flyingKick");
    if (!sword) await expect.poll(() => page.evaluate(() => window.__scene!.getObjectByName("RightLegPivot")?.rotation.x ?? 0), { timeout: 20000 }).toBeLessThan(-1.5);
    else await expect.poll(() => page.evaluate(() => window.__scene!.getObjectByName("EquippedSword")?.parent?.name)).toBe("RightWristPivot");
    await expect.poll(() => page.evaluate(() => window.__scene!.getObjectByName("EquippedSword")?.visible)).toBe(sword);
    // Hide only the pause overlay for a deterministic pose screenshot.
    await page.addStyleTag({ content: '.modal-shade { visibility:hidden !important; }' });
    await page.screenshot({ path: `artifacts/qa-${sword ? "jump-slash" : "flying-kick"}.png` });
  }
});
