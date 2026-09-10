import { test, expect } from '@playwright/test';

test('generated slam ripples load in background and shockwave keeps its world-space hit radius',async({page})=>{
  test.setTimeout(120000);
  await page.emulateMedia({reducedMotion:'no-preference'});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  let release!:()=>void;
  const optional=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/textures/effects/gpt-boss-*.webp',async route=>{await optional;await route.continue();});
  await page.goto('/?debug=boss&god=1');
  await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
  await expect.poll(()=>page.evaluate(()=>!!window.__scene?.getObjectByName('boss-hammer-ground-bursts'))).toBe(true);
  expect(await page.evaluate(()=>window.__scene!.getObjectByName('boss-hammer-ground-bursts')!.userData.texturesReady)).toBe(false);
  await page.evaluate(()=>{
    const g=window.__game!;g.update=()=>{};
    Object.assign(g,{phase:'playing',x:0,z:9,y:0,cameraYaw:.65,cameraPitch:.45,cameraDistance:15,
      lockedTarget:null,autoLockCooldown:100,invincible:0,elapsed:2});
    g.minions.forEach(e=>e.hp=0);g.boss.reset();
    Object.assign(g.boss,{x:0,z:0,yaw:0,move:'slam',state:'windup',timer:.01});
    Object.getPrototypeOf(g).update.call(g,.02,{x:0,z:0,sprint:false});
    g.effects.find(e=>e.ground)!.age=.3;
  });
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('boss-hammer-ground-bursts')!.children[0].visible)).toBe(true);
  release();
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('boss-hammer-ground-bursts')!.userData.texturesReady),{timeout:15000}).toBe(true);
  expect(await page.evaluate(()=>window.__scene!.getObjectByName('boss-attack-telegraph')!.userData.style)).toBe('segmented-energy');
  await page.evaluate(()=>{const g=window.__game!;g.effects=[];g.boss.state='windup';g.boss.timer=.85;g.impactTime=0;});
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('boss-attack-telegraph')!.visible)).toBe(true);
  const before=await page.evaluate(()=>window.__scene!.getObjectByName('boss-attack-telegraph')!.userData.charge);
  await page.evaluate(()=>{window.__game!.boss.timer=.3;});
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('boss-attack-telegraph')!.userData.charge)).toBeGreaterThan(before);
  const warning=await page.evaluate(()=>{
    const g=window.__game!,root=window.__scene!.getObjectByName('boss-attack-telegraph')!;
    return {position:root.position.toArray(),scale:root.scale.toArray(),target:[g.boss.slamX,.22,g.boss.slamZ],
      materials:root.children.map(child=>{
        const m=(child as import('three').Mesh<import('three').BufferGeometry,import('three').MeshBasicMaterial>).material;
        return {blending:m.blending,transparent:m.transparent,depthWrite:m.depthWrite};
      })};
  });
  expect(warning.position).toEqual(warning.target);expect(warning.scale).toEqual([2.65,1,2.65]);
  // AdditiveBlending (2) contributes only light; dark texture edges cannot darken the floor.
  expect(warning.materials).toEqual(Array.from({length:3},()=>({blending:2,transparent:true,depthWrite:false})));
  await page.screenshot({path:'artifacts/boss-generated-telegraph.png'});
  await page.evaluate(()=>{
    const g=window.__game!;g.boss.timer=.01;
    Object.getPrototypeOf(g).update.call(g,.02,{x:0,z:0,sprint:false});
    g.effects.find(e=>e.ground)!.age=.06;
  });
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('boss-attack-telegraph')!.visible)).toBe(false);
  await page.waitForTimeout(150);
  await page.screenshot({path:'artifacts/boss-generated-ground-impact.png'});
  await page.evaluate(()=>{window.__game!.effects.find(e=>e.ground)!.age=.34;});
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('boss-hammer-ground-bursts')!.children.find(c=>c.visible)?.children.slice(2).filter(c=>c.visible).length)).toBe(3);
  const slam=await page.evaluate(()=>{
    const root=window.__scene!.getObjectByName('boss-hammer-ground-bursts')!;
    const burst=root.children.find(c=>c.visible)!;
    return {position:burst.position.toArray(),rings:burst.children.slice(2).filter(c=>c.visible).length,
      impactMap:!!(burst.children[0] as import('three').Mesh<import('three').BufferGeometry,import('three').MeshBasicMaterial>).material.map,
      floor:[window.__game!.boss.slamX,window.__game!.boss.slamZ]};
  });
  expect(slam.rings).toBe(3);expect(slam.impactMap).toBe(true);
  expect(slam.position).toEqual([slam.floor[0],.23,slam.floor[1]]);
  await page.screenshot({path:'artifacts/boss-generated-water-ripples.png'});
  await page.evaluate(()=>{
    const g=window.__game!;g.effects=[];
    Object.assign(g.boss,{move:'wave',state:'recover',timer:.8,wave:7,waveX:-1,waveZ:1});
  });
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('boss-water-shockwave')!.visible)).toBe(true);
  const crest=await page.evaluate(()=>{
    const m=window.__scene!.getObjectByName('boss-raised-ground-wave')! as import('three').Mesh;
    const p=m.geometry.getAttribute('position');let height=0;
    for(let i=0;i<p.count;i++)height=Math.max(height,p.getZ(i));
    const material=m.material as import('three').MeshBasicMaterial;
    return {height,visible:m.visible,unlit:material.isMeshBasicMaterial,
      blending:material.blending,transparent:material.transparent,depthWrite:material.depthWrite};
  });
  expect(crest.visible).toBe(true);expect(crest.height).toBeGreaterThan(.8);
  expect(crest).toMatchObject({unlit:true,blending:2,transparent:true,depthWrite:false});
  await page.screenshot({path:'artifacts/boss-generated-shockwave.png'});
  await page.evaluate(()=>{Object.assign(window.__game!.boss,{x:8,z:-5,yaw:2.6,stagger:.2});});
  await page.waitForTimeout(150);
  const wave=await page.evaluate(()=>{
    const root=window.__scene!.getObjectByName('boss-water-shockwave')!;
    const mesh=root.children[0] as import('three').Mesh;
    const p=mesh.geometry.getAttribute('position');
    let min=Infinity,max=0,shadow=false;
    for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getY(i));min=Math.min(min,r);max=Math.max(max,r);}
    root.traverse(n=>{shadow ||= n.castShadow;});
    return {position:root.position.toArray(),min,max,shadow};
  });
  expect(wave.position).toEqual([-1,.23,1]);
  expect(wave.min).toBeCloseTo(6.4,4);expect(wave.max).toBeCloseTo(7.6,4);expect(wave.shadow).toBe(false);
  await page.evaluate(()=>{window.__game!.boss.wave=-1;window.__game!.effects=[];});
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('boss-water-shockwave')!.visible)).toBe(false);
  // Hammer-only intensity still honors both accessibility opt-outs.
  await page.evaluate(()=>{const g=window.__game!;g.impactTime=.18;g.impactStrength=3.1;g.cameraSettings.shake=false;});
  await page.waitForTimeout(250);
  const base=await page.evaluate(()=>window.__camera!.quaternion.toArray());
  await page.evaluate(()=>{window.__game!.cameraSettings.shake=true;});
  await expect.poll(()=>page.evaluate(base=>{const q=window.__camera!.quaternion;return q.angleTo(q.clone().fromArray(base));},base)).toBeGreaterThan(.012);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>page.evaluate(base=>{const q=window.__camera!.quaternion;return q.angleTo(q.clone().fromArray(base));},base)).toBeLessThan(.005);
  expect(errors).toEqual([]);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{
    const b=window.__game!.boss;b.reset();Object.assign(b,{sequence:1,timer:0,x:0,z:0});
    b.update(.05,{x:0,z:20},[],()=>0);
    for(let i=0;i<10;i++)b.update(.05,{x:0,z:20},[],()=>0);
  });
  await expect.poll(()=>page.evaluate(()=>window.__scene!.getObjectByName('boss-pursuit-boost')?.visible)).toBe(true);
  await page.screenshot({path:'artifacts/boss-pursuit-boost.png'});
});
