import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Exercise the production bundle without allocating or starting a local service.
test.beforeEach(async ({ page }) => {
  const root = path.resolve("dist");
  await page.route("http://legend.test/**", async (route) => {
    const requested = decodeURIComponent(
      new URL(route.request().url()).pathname,
    ).replace(/^\/thelegendoftrump\/?/, "");
    const file = path.resolve(root, requested || "index.html");
    if (!file.startsWith(root + path.sep))
      return route.fulfill({ status: 403 });
    try {
      const contentType: Record<string, string> = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".woff2": "font/woff2",
        ".png": "image/png",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
      };
      await route.fulfill({
        body: await readFile(file),
        contentType:
          contentType[path.extname(file)] || "application/octet-stream",
      });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
});

test("append-only saves survive reload; debug loads and replays while mobile panel fits", async ({
  page,
}) => {
  test.setTimeout(120000); // Two full WebGL boots under software rendering.
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://legend.test/thelegendoftrump/?debug");
  await expect(page.locator(".checkpoint-toggle")).toBeVisible();
  await page.waitForFunction(() => !!(window as any).__game);
  await page.evaluate(async () => {
    const g = (window as any).__game;
    g.start();
    g.x = g.guards[0].x;
    g.z = g.guards[0].z + 2;
    g.update(0.01, { x: 0, z: 0, sprint: false });
    await new Promise((r) => setTimeout(r, 100));
    g.pause();
  });
  await page.locator(".checkpoint-toggle").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "加载", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "回放", exact: true }).first(),
  ).toBeVisible();
  const count = await page
    .getByRole("button", { name: "加载", exact: true })
    .count();
  expect(
    await page.evaluate(async () => {
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        const request = indexedDB.open("legend-checkpoints", 2);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const value = await new Promise<any>((resolve) => {
        const request = db
          .transaction("checkpoints")
          .objectStore("checkpoints")
          .getAll();
        request.onsuccess = () => resolve(request.result[0]);
      });
      const rejected = await new Promise<boolean>((resolve) => {
        const tx = db.transaction("checkpoints", "readwrite");
        tx.objectStore("checkpoints").add({ ...value, hp: 99 });
        tx.onabort = () => resolve(true);
        tx.oncomplete = () => resolve(false);
      });
      db.close();
      return rejected;
    }),
  ).toBe(true);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.reload();
  await page.locator(".checkpoint-toggle").click();
  await expect(
    page.getByRole("button", { name: "加载", exact: true }),
  ).toHaveCount(count);
  await page.getByRole("button", { name: "加载", exact: true }).first().click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => (window as any).__game.phase)).toBe(
    "paused",
  );
  await page.keyboard.press("F8");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await page.getByRole("dialog").boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "回放", exact: true }).last().click();
  await expect(
    page.getByRole("button", { name: "退出回放", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "退出回放", exact: true }).click();
  expect(errors).toEqual([]);
});

test("normal URL does not expose debug panel", async ({ page }) => {
  await page.goto("http://legend.test/thelegendoftrump/");
  await expect(page.locator(".game")).toBeVisible();
  await expect(page.locator(".checkpoint-toggle")).toHaveCount(0);
});
