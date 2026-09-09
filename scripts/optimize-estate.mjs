import { NodeIO } from "@gltf-transform/core";
import { dedup, join, weld, prune } from "@gltf-transform/functions";
const file = new URL("../public/models/white-house-estate.glb", import.meta.url)
  .pathname;
const io = new NodeIO(),
  doc = await io.read(file);
await doc.transform(
  dedup(),
  join({ keepNamed: false, cleanup: false }),
  weld(),
  prune({ keepLeaves: false }),
);
await io.write(file, doc);
console.log("Estate meshes:", doc.getRoot().listMeshes().length);
