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

test("debug mode asks for a local save folder and never offers browser-backed saves", async ({
  page,
}) => {
  await page.goto("http://legend.test/thelegendoftrump/?debug");
  await expect(page.locator(".checkpoint-toggle")).toBeVisible();
  await page.locator(".checkpoint-toggle").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "选择本地存档文件夹" }),
  ).toBeVisible();
  await expect(page.getByText(/文件保存在所选本地文件夹/)).toBeVisible();
  await expect(page.getByText(/仅保存在当前浏览器/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "加载", exact: true }),
  ).toHaveCount(0);
});

test("normal URL does not expose debug panel", async ({ page }) => {
  await page.goto("http://legend.test/thelegendoftrump/");
  await expect(page.locator(".game")).toBeVisible();
  await expect(page.locator(".checkpoint-toggle")).toHaveCount(0);
});
