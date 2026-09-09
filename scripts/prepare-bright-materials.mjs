import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const out = path.resolve('public/textures/bright-materials');
await mkdir(out, { recursive: true });
const groups = [
 ['grass','leaf','bark','stone','paving','road','roof','wood','walnut','soil','brick','terracotta','marble','hedge','sand','water'],
 ['fabric','carpet','leather','paint','metal','gold','rubber','skin','hair','paper','glass','ceramic','rope','canvas','feather','flower'],
];
for (let atlas = 0; atlas < 2; atlas++) {
 const source = process.argv[atlas+2];
 if (!source) throw new Error('Pass environment and equipment GPT Image atlas paths.');
 await copyFile(source, path.join(out, `source-${atlas}.png`));
 const { width, height } = await sharp(source).metadata();
 for (let i=0;i<16;i++) {
  const left=Math.round(i%4*width/4)+2, top=Math.round(Math.floor(i/4)*height/4)+2;
  const right=Math.round((i%4+1)*width/4)-2, bottom=Math.round((Math.floor(i/4)+1)*height/4)-2;
  const tile=sharp(source).extract({left,top,width:right-left,height:bottom-top}).resize(256,256);
  await tile.clone().webp({quality:90}).toFile(path.join(out,groups[atlas][i]+'-color.webp'));
  await tile.clone().greyscale().linear(.12,220).png().toFile(path.join(out,groups[atlas][i]+'-roughness.png'));
 }
}
await writeFile(path.join(out,'manifest.json'),JSON.stringify({generator:'GPT Image',tileSize:256,surfaces:groups.flat(),roughness:'Artistic luminance-derived linear variation; not a measured scan',projection:'World-scaled planar coordinates for untextured meshes; authored maps preserved'},null,2));
