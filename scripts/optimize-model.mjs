import { NodeIO } from "@gltf-transform/core";
import { dedup, prune, weld } from "@gltf-transform/functions";
import { stat, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const directory = new URL("../public/models/", import.meta.url);
const io = new NodeIO();
for (const name of await readdir(directory)) {
  if (!name.endsWith(".glb")) continue;
  const path = fileURLToPath(new URL(name, directory)),
    before = (await stat(path)).size;
  const document = await io.read(path);
  await document.transform(dedup(), weld(), prune({ keepLeaves: true }));
  await io.write(path, document);
  console.log(`${name}: ${before} → ${(await stat(path)).size} bytes`);
}
