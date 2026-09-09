import { NodeIO } from "@gltf-transform/core";
import { dedup, weld, prune, join } from "@gltf-transform/functions";
const io = new NodeIO();
for (const file of ["field-archer", "field-brute", "field-camp"]) {
  const path = new URL(`../public/models/${file}.glb`, import.meta.url)
    .pathname;
  const doc = await io.read(path);
  await doc.transform(
    dedup(),
    weld(),
    ...(file === "field-camp" ? [join({ keepNamed: false })] : []),
    prune({ keepLeaves: true }),
  );
  await io.write(path, doc);
  console.log(file, doc.getRoot().listMeshes().length);
}
