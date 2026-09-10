import { spawnSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
const guard =
  "/Users/jammyfu/works/AI/Project/agent-orchestration/tools/portctl.py";
let port = process.env.PORT;
if (!port && existsSync(guard)) {
  const result = spawnSync(
    "python3",
    [guard, "env", "--pool", "worktree-frontend", "--key", process.cwd()],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  port = result.stdout.match(/(?:export )?PORT=['"]?(\d+)/)?.[1];
}
if (!port) {
  console.error("Set PORT to an available port, e.g. PORT=<port> npm run dev");
  process.exit(1);
}
const child = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    ...(process.argv.includes("--preview") ? ["preview"] : []),
    // Bind to the LAN by default so a phone on the same Wi-Fi can open the
    // development build. HOST=127.0.0.1 keeps an explicitly local server.
    "--host",
    process.env.HOST || "0.0.0.0",
    "--port",
    port,
    "--strictPort",
  ],
  { stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
