import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
test("local autosave reaches disk, survives refresh, loads and replays", async ({
  page,
}) => {
  test.skip(
    !process.env.LOCAL_SAVE_E2E_URL,
    "Requires running local development server",
  );
  test.setTimeout(120000);
  await page.goto(process.env.LOCAL_SAVE_E2E_URL!);
  await page.waitForFunction(() => !!(window as any).__game);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.start();
    g.x = g.guards[0].x;
    g.z = g.guards[0].z + 2;
    g.update(0.01, { x: 0, z: 0, sprint: false });
    g.pause();
  });
  await page.locator(".checkpoint-toggle").click();
  await expect(
    page.getByRole("button", { name: "加载", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "回放", exact: true }).first(),
  ).toBeVisible();
  const location = await page.evaluate(async () => {
    const root = "/thelegendoftrump/__local-saves";
    return {
      folder: (await (await fetch(root)).json()).path,
      files: await (await fetch(root + "/checkpoints")).json(),
    };
  });
  const data = JSON.parse(
    await readFile(
      path.join(location.folder, "checkpoints", location.files[0]),
      "utf8",
    ),
  );
  expect(data.schema).toBe(1);
  expect(data.reason).toBe("before");
  await page.reload();
  await page.locator(".checkpoint-toggle").click();
  await page.getByRole("button", { name: "加载", exact: true }).first().click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => (window as any).__game.phase)).toBe(
    "paused",
  );
  await page.locator(".checkpoint-toggle").click();
  await page.getByRole("button", { name: "回放", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "退出回放" })).toBeVisible();
  await page.getByRole("button", { name: "退出回放" }).click();
});
