import type { Page } from "@playwright/test";
/** Teleport only the test setup; use the real interaction and reward code. */
export async function collectChest(page: Page, id: string, restore = true) {
  await page.evaluate(
    async ({ id, restore }) => {
      const modulePath = "/src/game/world.ts";
      const { interactions } = await import(modulePath);
      const chest = interactions.find((i: { id: string }) => i.id === id);
      if (!chest) return;
      const { x, z } = chest;
      const g = window.__game!;
      const previous = {
        x: g.x,
        z: g.z,
        y: g.y,
        vy: g.vy,
        grounded: g.grounded,
      };
      Object.assign(g, { x, z: z + 1.8, y: 0, vy: 0, grounded: true });
      g.interact();
      if (restore) Object.assign(g, previous);
    },
    { id, restore },
  );
}
export async function equipMelee(page: Page) {
  await collectChest(page, "chest-sword");
  await collectChest(page, "chest-shield");
}
