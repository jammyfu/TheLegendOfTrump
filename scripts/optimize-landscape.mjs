import { NodeIO } from "@gltf-transform/core";
import { dedup, join, weld, prune } from "@gltf-transform/functions";
const io = new NodeIO(),
  path = new URL("../public/models/park-landscape.glb", import.meta.url)
    .pathname;
const doc = await io.read(path);
await doc.transform(
  dedup(),
  join({ keepNamed: false, cleanup: false }),
  weld(),
  prune({ keepLeaves: false }),
);
await io.write(path, doc);
console.log("Landscape meshes:", doc.getRoot().listMeshes().length);
