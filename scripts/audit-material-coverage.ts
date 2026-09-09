import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { surfaceFor } from "../src/game/surfaceCatalog";
const models = readdirSync("public/models").filter(f => f.endsWith(".glb"));
const report: Record<string, unknown> = {};
for (const file of models) {
  const buffer = readFileSync(`public/models/${file}`);
  const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
  report[file] = gltf.nodes.filter((n: any) => n.mesh !== undefined).flatMap((node: any) =>
    gltf.meshes[node.mesh].primitives.map((p: any) => {
      const material = gltf.materials[p.material];
      return { object: node.name, material: material?.name ?? "", surface: surfaceFor(material?.name ?? "", node.name), authoredMap: !!material?.pbrMetallicRoughness?.baseColorTexture };
    }));
}
writeFileSync("public/textures/bright-materials/model-coverage.json", JSON.stringify(report, null, 2));
console.log(`Audited ${models.length} GLB models.`);
