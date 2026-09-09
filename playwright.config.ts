import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  use: {
    baseURL: process.env.GAME_URL ?? "http://127.0.0.1:4439",
    headless: true,
    channel: process.env.BROWSER_CHANNEL ?? "chrome",
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
    },
  },
  workers: 1,
  reporter: "list",
});
