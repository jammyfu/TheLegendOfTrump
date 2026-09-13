import {
  mkdir,
  readFile,
  readdir,
  writeFile,
  link,
  unlink,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";

// Development only. No arbitrary paths or cross-origin filesystem access.
export function localSaves(root = resolve(".local/saves")) {
  return {
    name: "local-save-files",
    configureServer(server) {
      server.middlewares.use(
        "/thelegendoftrump/__local-saves",
        async (req, res) => {
          const reply = (status, data) => {
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          };
          const host = req.headers.host ?? "";
          if (
            !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ||
            req.headers["sec-fetch-site"] === "cross-site" ||
            (req.headers.origin && req.headers.origin !== `http://${host}`)
          )
            return reply(403, { error: "仅允许本机同源访问" });
          res.setHeader("Cache-Control", "no-store");
          const parts = new URL(req.url, `http://${host}`).pathname
            .split("/")
            .filter(Boolean);
          try {
            if (!parts.length && req.method === "GET")
              return reply(200, { path: root });
            const [store, filename] = parts;
            if (
              !["checkpoints", "recordings"].includes(store) ||
              parts.length > 2
            )
              return reply(400, { error: "无效存档目录" });
            const valid = (name) =>
              /^[a-zA-Z0-9_-]+\.(save\.json|replay\.gz|replay\.json)$/.test(
                name,
              );
            if (filename && !valid(filename))
              return reply(400, { error: "无效存档文件名" });
            const dir = join(root, store);
            if (req.method === "GET" && !filename) {
              const files = await readdir(dir).catch((e) => {
                if (e.code === "ENOENT") return [];
                throw e;
              });
              return reply(200, files.filter(valid));
            }
            if (req.method === "GET" && filename) {
              const data = await readFile(join(dir, filename));
              res.setHeader("Content-Type", "application/octet-stream");
              return res.end(data);
            }
            if (
              req.method !== "POST" ||
              !filename ||
              req.headers["x-legend-save"] !== "1"
            )
              return reply(403, { error: "不允许此操作" });
            const chunks = [];
            let size = 0;
            for await (const chunk of req) {
              size += chunk.length;
              if (size > 32 * 1024 * 1024)
                return reply(413, { error: "存档超过 32 MB" });
              chunks.push(chunk);
            }
            await mkdir(dir, { recursive: true });
            const temporary = join(dir, `.pending-${randomUUID()}`);
            try {
              await writeFile(temporary, Buffer.concat(chunks), { flag: "wx" });
              // Atomic publish, fails if destination exists: never overwrites history.
              await link(temporary, join(dir, filename));
            } finally {
              await unlink(temporary).catch(() => {});
            }
            return reply(201, { saved: filename });
          } catch (error) {
            return reply(
              error.code === "EEXIST"
                ? 409
                : error.code === "ENOENT"
                  ? 404
                  : 500,
              {
                error:
                  error.code === "EEXIST"
                    ? "存档已存在，未覆盖原文件"
                    : `本地存档失败：${error.code ?? error.message}`,
              },
            );
          }
        },
      );
    },
  };
}
