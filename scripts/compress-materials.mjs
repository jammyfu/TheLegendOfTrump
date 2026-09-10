import sharp from 'sharp';
import { readdir, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Keep authoring atlases/originals intact. Only these runtime derivatives load.
const output = 'public/textures/runtime';
await mkdir(output, { recursive: true });
const files = [];
for (const directory of ['bright-materials', 'normals']) {
  for (const name of await readdir(`public/textures/${directory}`)) {
    if (!/-(color\.webp|roughness\.png|normal\.png)$/.test(name)) continue;
    const source = `public/textures/${directory}/${name}`;
    const target = path.join(output, name.replace(/\.png$/, '.webp'));
    const color = name.endsWith('-color.webp');
    await sharp(source).webp(color ? { quality: 80, effort: 6 } : { lossless: true, effort: 6 }).toFile(target);
    // Data textures must remain bit-exact; don't damage normal vectors with JPEG.
    if (!color) {
      const before = await sharp(source).ensureAlpha().raw().toBuffer();
      const after = await sharp(target).ensureAlpha().raw().toBuffer();
      if (!before.equals(after)) throw new Error(`Data texture changed: ${name}`);
    }
    files.push({ name: path.basename(target), before: (await stat(source)).size, after: (await stat(target)).size, lossless: !color });
  }
}
const result = { before: files.reduce((n, f) => n + f.before, 0), after: files.reduce((n, f) => n + f.after, 0), files };
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ before: result.before, after: result.after, count: files.length, savedPercent: 100 * (1 - result.after / result.before) }));
