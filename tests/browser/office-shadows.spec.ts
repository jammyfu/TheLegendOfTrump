import { test, expect } from '@playwright/test';

test('indoor scenery never casts shadows; actors keep fixed-light floor shadows',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?debug=boss&god=1');
  await expect(page.locator('.game-loading')).toHaveCount(0,{timeout:90000});
  await expect.poll(()=>page.evaluate(()=>!!window.__scene?.getObjectByName('office-environment'))).toBe(true);
  await page.evaluate(()=>{
    const g=window.__game!;
    g.update=()=>{};
    Object.assign(g,{x:0,z:9,y:0,yaw:Math.PI,phase:'playing',lockedTarget:null,
      cameraYaw:.7,cameraPitch:.4,cameraDistance:11,invincible:0});
    Object.assign(g.boss,{active:true,x:0,z:0,hp:18,yaw:0,state:'chase',stagger:0});
    Object.assign(g.minions[0],{x:-5,z:5,hp:4,stun:0,windup:0,attackTime:0});
    g.minions[1].hp=0;
  });
  const read=()=>page.evaluate(()=>{
    const scene=window.__scene!;
    const room=scene.getObjectByName('office-environment')!;
    const light=scene.getObjectByName('office-character-light') as import('three').DirectionalLight;
    let casters=0, receivers=0, meshes=0, cutaways=0;
    room.traverse(node=>{
      if(!(node as import('three').Mesh).isMesh)return;
      meshes++;if(node.castShadow)casters++;if(node.receiveShadow)receivers++;
      if(node.name.startsWith('OfficeCutaway_')||node.parent?.name.startsWith('OfficeCutaway_'))cutaways++;
    });
    const actors=['hero-model','guard-100','guard-101'].map(name=>{
      const actor=scene.getObjectByName(name)!;let shadows=0;
      actor.traverseVisible(n=>{if((n as import('three').Mesh).isMesh&&n.castShadow)shadows++;});
      return shadows;
    });
    return {casters,receivers,meshes,cutaways,actors,light:light.position.toArray(),
      target:light.target.position.toArray(),casts:light.castShadow,hasMap:!!light.shadow.map,
      bounds:[light.shadow.camera.left,light.shadow.camera.right],
      shadowLights:scene.children.filter(n=>(n as import('three').Light).isLight&&n.castShadow).length};
  });
  await expect.poll(async()=>Math.min(...(await read()).actors)).toBeGreaterThan(0);
  for(const [x,z,yaw] of [[0,9,.7],[-20,4,2.8],[20,-8,-1.1]]){
    await page.evaluate(([x,z,yaw])=>{Object.assign(window.__game!,{x,z,cameraYaw:yaw});},[x,z,yaw]);
    // Exercise camera-driven wall fading for several frames, not only its initial flags.
    await page.waitForTimeout(250);
    const result=await read();
    expect(result.meshes).toBeGreaterThan(10);expect(result.cutaways).toBeGreaterThan(0);
    expect(result.casters).toBe(0);expect(result.receivers).toBe(result.meshes);
    expect(result.actors.every(n=>n>0)).toBe(true);
    expect(result.light).toEqual([-8,40,6]);expect(result.target).toEqual([0,0,0]);
    expect(result.casts&&result.hasMap).toBe(true);expect(result.shadowLights).toBe(1);
    expect(result.bounds).toEqual([-42,42]);
    if(x===0)await page.screenshot({path:'artifacts/office-character-shadows.png'});
  }
  // Leaving the room must restore the original outdoor player-following sun.
  await page.evaluate(()=>{Object.assign(window.__game!,{zone:'grounds',x:0,z:145});});
  await expect.poll(()=>page.evaluate(()=>!!window.__scene?.getObjectByName('character-follow-sun')),{timeout:60000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.__scene?.getObjectByName('character-follow-sun')?.position.z)).toBe(160);
  expect(await page.evaluate(()=>!!window.__scene?.getObjectByName('office-character-light'))).toBe(false);
  expect(errors).toEqual([]);
});
