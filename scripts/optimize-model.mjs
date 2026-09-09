import { NodeIO } from "@gltf-transform/core";
import { dedup, prune, weld } from "@gltf-transform/functions";
import { stat } from "node:fs/promises";
const path = new URL("../public/models/trump-n64.glb", import.meta.url)
  .pathname;
const io = new NodeIO();
const before = (await stat(path)).size;
const document = await io.read(path);
await document.transform(dedup(), weld(), prune({ keepLeaves: true }));
await io.write(path, document);
console.log(
  `Character optimized: ${before} → ${(await stat(path)).size} bytes`,
);
