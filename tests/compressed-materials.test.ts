import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

test('runtime materials save transfer bytes and preserve all data texture pixels', async () => {
  const manifest = JSON.parse(await readFile('public/textures/runtime/manifest.json','utf8'));
  assert.ok(manifest.after < manifest.before * .8);
  for (const entry of manifest.files) {
    const target = `public/textures/runtime/${entry.name}`;
    const isNormal = entry.name.endsWith('-normal.webp');
    const source = `public/textures/${isNormal?'normals':'bright-materials'}/${entry.name.replace(/-(normal|roughness)\.webp$/,'-$1.png')}`;
    const original = await sharp(source).metadata();
    const compressed = await sharp(target).metadata();
    assert.equal(compressed.width,original.width);
    assert.equal(compressed.height,original.height);
    if (entry.lossless) {
      assert.deepEqual(await sharp(target).ensureAlpha().raw().toBuffer(),await sharp(source).ensureAlpha().raw().toBuffer(),entry.name);
    }
  }
});
