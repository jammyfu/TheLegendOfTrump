// Preserve the runtime naming contract after Blender's shared-datablock suffixes.
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune } from '@gltf-transform/functions';

const io = new NodeIO();
const doc = await io.read('output/chest-repaired.glb');
for (const node of doc.getRoot().listNodes()) {
  let name = node.getName().replace(/\.\d+$/, '');
  if (/^(Chest_band|Lid_band)$/.test(name) && node.getTranslation()[0] > 0) name += '.001';
  node.setName(name);
}
for (const material of doc.getRoot().listMaterials()) {
  material.setName(material.getName().replace(/\.\d+$/, ''));
}
await doc.transform(dedup(), prune());
await io.write('public/models/adventure-chest.glb', doc);
