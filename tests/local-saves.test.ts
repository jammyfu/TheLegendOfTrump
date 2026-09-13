import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { localSaves } from "../scripts/local-saves.mjs";

test("local save service writes real files atomically, refuses overwrite and limits access", async () => {
  const root = await mkdtemp(join(tmpdir(), "legend-files-"));
  let handler: any;
  localSaves(root).configureServer({
    middlewares: {
      use: (_: string, fn: any) => {
        handler = fn;
      },
    },
  });
  async function call(url: string, method = "GET", body = "", headers = {}) {
    const req = Object.assign(Readable.from(body ? [Buffer.from(body)] : []), {
      url,
      method,
      headers: { host: "127.0.0.1:4439", "x-legend-save": "1", ...headers },
    });
    let status = 200,
      data = "";
    await handler(req, {
      set statusCode(n) {
        status = n;
      },
      setHeader() {},
      end(value: any) {
        data = String(value);
      },
    });
    return { status, data };
  }
  assert.equal(
    (await call("/checkpoints/test.save.json", "POST", '{"hp":3}')).status,
    201,
  );
  assert.equal(
    await readFile(join(root, "checkpoints/test.save.json"), "utf8"),
    '{"hp":3}',
  );
  assert.equal(
    (await call("/checkpoints/test.save.json", "POST", '{"hp":0}')).status,
    409,
  );
  assert.equal(
    await readFile(join(root, "checkpoints/test.save.json"), "utf8"),
    '{"hp":3}',
  );
  assert.deepEqual(JSON.parse((await call("/checkpoints")).data), [
    "test.save.json",
  ]);
  assert.equal((await call("/checkpoints/test.save.json")).data, '{"hp":3}');
  assert.equal((await call("/recordings")).data, "[]");
  assert.equal(
    (
      await call("/checkpoints/test.save.json", "POST", "bad", {
        origin: "https://example.com",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("/checkpoints/test.save.json", "POST", "bad", {
        "x-legend-save": "",
      })
    ).status,
    403,
  );
  assert.equal(
    (await call("/checkpoints/%2e%2e%2fsecret", "POST", "bad")).status,
    400,
  );
  assert.deepEqual(await readdir(join(root, "checkpoints")), [
    "test.save.json",
  ]);
});
