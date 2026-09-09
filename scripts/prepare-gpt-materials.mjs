import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const source = process.argv[2];
if (!source) throw new Error('Pass the GPT Image material atlas path.');
const out = path.resolve('public/textures/gpt-materials');
await mkdir(out, { recursive: true });
await copyFile(source, path.join(out, 'source-atlas.png'));
const { width, height } = await sharp(source).metadata();
const surfaces = ['grass','stone','paving','roof','wood','bark','leather','fabric','metal','gold','paint','rubber','leaf','skin','hair','glass'];
for (let i = 0; i < surfaces.length; i++) {
  const left = Math.round((i % 4) * width / 4) + 2;
  const top = Math.round(Math.floor(i / 4) * height / 4) + 2;
  const right = Math.round((i % 4 + 1) * width / 4) - 2;
  const bottom = Math.round((Math.floor(i / 4) + 1) * height / 4) - 2;
  const tile = sharp(source).extract({ left, top, width: right-left, height: bottom-top }).resize(256,256);
  await tile.clone().webp({ quality: 90 }).toFile(path.join(out, `${surfaces[i]}-color.webp`));
  // An artistic roughness variation, not a physically measured material scan.
  await tile.clone().greyscale().linear(0.22, 195).png().toFile(path.join(out, `${surfaces[i]}-roughness.png`));
}
await writeFile(path.join(out, 'manifest.json'), JSON.stringify({ generator: 'GPT Image', source: 'source-atlas.png', tileSize: 256, surfaces, colorSpace: 'sRGB', roughness: 'Derived from generated color luminance; linear data', normal: 'Existing procedural normal maps retained' }, null, 2));
console.log(`Prepared ${surfaces.length} color textures and roughness maps.`);
