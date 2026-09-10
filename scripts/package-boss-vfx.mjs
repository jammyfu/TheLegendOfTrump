import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const sources=process.argv.slice(2);
if(sources.length!==3)throw new Error('Usage: node scripts/package-boss-vfx.mjs IMPACT.png RIPPLE.png TELEGRAPH.png');
for(const [i,file] of ['gpt-boss-ground-impact.webp','gpt-boss-water-ripple.webp','gpt-boss-telegraph.webp'].entries()){
  const path=fileURLToPath(new URL('../public/textures/effects/'+file,import.meta.url));
  const info=await sharp(sources[i]).resize(512,512,{fit:'contain',background:'#00000000'})
    .webp({quality:85,alphaQuality:90,effort:6}).toFile(path);
  console.log(file,info.size+' bytes');
}
